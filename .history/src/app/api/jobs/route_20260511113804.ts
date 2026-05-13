import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, LIMITS, checkLengths } from '@/lib/auth';
import { notifyCustomerStatusChange } from '@/lib/customerNotifications';

// POST /api/jobs — admin or reception
export async function POST(request: Request) {
    const auth = await requireSession(['admin', 'reception']);
    if ('error' in auth) return auth.error;

    try {
        const body = await request.json();

        if (!body.customerId || !body.deviceId || !body.problemDescription) {
            return NextResponse.json(
                { error: 'customerId, deviceId and problemDescription are required.' },
                { status: 400 }
            );
        }

        // Input length caps
        const lengthError = checkLengths([
            [body.problemDescription, 'problemDescription', LIMITS.notes],
        ]);
        if (lengthError) {
            return NextResponse.json({ error: lengthError }, { status: 400 });
        }

        const jobStatus = body.status || 'New';

        const job = await prisma.job.create({
            data: {
                customerId: body.customerId,
                deviceId: body.deviceId,
                engineerId: body.assignedEngineerId || null,
                problemDesc: body.problemDescription,
                status: jobStatus,
                estimatedCost: body.estimatedCost ? parseFloat(body.estimatedCost) : null,
                checklist: body.checklist || undefined,
                rating: body.rating || undefined,
                feedback: body.feedback || undefined,
                linkedJobId: body.linkedJobId || undefined,
                activities: {
                    create: {
                        userId: auth.user.id,
                        action: 'Created Job',
                        details: `Job created with status ${jobStatus}`
                    }
                }
            },
            include: { activities: true }
        });

        // ── Internal engineer notification (unchanged) ────────────
        if (job.engineerId) {
            await prisma.notification.create({
                data: {
                    userId: job.engineerId,
                    message: `New job assigned: ${job.problemDesc.substring(0, 60)}`,
                    jobId: job.id,
                },
            });
        }

        // ── Customer notification on job creation ─────────────────
        // Notify the customer when the job is created with "Assigned" status
        // (i.e. an engineer was already assigned at creation time).
        // If no engineer is assigned yet (status = "New"), no customer notification
        // is sent here — it will fire when reception later sets it to "Assigned".
        if (jobStatus === 'Assigned' || (jobStatus === 'New' && job.engineerId)) {
            const notifyStatus = 'Assigned';

            const [customer, device] = await Promise.all([
                prisma.customer.findUnique({ where: { id: job.customerId } }),
                prisma.device.findUnique({ where: { id: job.deviceId } }),
            ]);

            if (customer) {
                const deviceInfo = device
                    ? `${device.brand} ${device.type} (${device.model})`
                    : undefined;

                notifyCustomerStatusChange({
                    customerName: customer.name,
                    phone: customer.phone,
                    email: (customer as any).email ?? null,
                    jobId: job.id,
                    newStatus: notifyStatus,
                    deviceInfo,
                }).catch((err) =>
                    console.error('[api/jobs POST] Notification error:', err)
                );
            }
        }

        return NextResponse.json({
            ...job,
            problemDescription: job.problemDesc,
            assignedEngineerId: job.engineerId,
            estimatedCost: job.estimatedCost ?? 0,
            createdAt: job.createdAt.toISOString(),
            updatedAt: job.updatedAt.toISOString(),
            activities: job.activities.map((a: any) => ({
                ...a,
                createdAt: a.createdAt.toISOString()
            }))
        }, { status: 201 });
    } catch (error) {
        console.error('[api/jobs POST]', error);
        return NextResponse.json({ error: 'Failed to create job.' }, { status: 500 });
    }
}
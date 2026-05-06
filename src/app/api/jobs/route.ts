import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, LIMITS, checkLengths } from '@/lib/auth';

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

        const job = await prisma.job.create({
            data: {
                customerId: body.customerId,
                deviceId: body.deviceId,
                engineerId: body.assignedEngineerId || null,
                problemDesc: body.problemDescription,
                status: body.status || 'New',
                estimatedCost: body.estimatedCost ? parseFloat(body.estimatedCost) : null,
            },
        });

        if (job.engineerId) {
            await prisma.notification.create({
                data: {
                    userId: job.engineerId,
                    message: `New job assigned: ${job.problemDesc.substring(0, 60)}`,
                    jobId: job.id,
                },
            });
        }

        return NextResponse.json({
            ...job,
            problemDescription: job.problemDesc,
            assignedEngineerId: job.engineerId,
            estimatedCost: job.estimatedCost ?? 0,
            createdAt: job.createdAt.toISOString(),
            updatedAt: job.updatedAt.toISOString(),
        }, { status: 201 });
    } catch (error) {
        console.error('[api/jobs POST]', error);
        return NextResponse.json({ error: 'Failed to create job.' }, { status: 500 });
    }
}

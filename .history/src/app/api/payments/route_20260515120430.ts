import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { fireWebhooks } from '@/lib/webhooks';
import { writeAuditLog } from '@/lib/auditLog';

// POST /api/payments — admin or reception only
export async function POST(request: Request) {
    const auth = await requireSession(['admin', 'reception']);
    if ('error' in auth) return auth.error;

    try {
        const body = await request.json();

        if (!body.jobId) {
            return NextResponse.json({ error: 'jobId is required.' }, { status: 400 });
        }

        const serviceCharge = parseFloat(body.serviceCharge) || 0;
        const partsCost = parseFloat(body.partsCost) || 0;

        if (serviceCharge < 0 || partsCost < 0) {
            return NextResponse.json({ error: 'Charges cannot be negative.' }, { status: 400 });
        }

        const payment = await prisma.payment.create({
            data: {
                jobId: body.jobId,
                serviceCharge,
                partsCost,
                totalBill: serviceCharge + partsCost,
                status: body.status || 'Unpaid',
            },
        });

        await prisma.job.update({
            where: { id: body.jobId },
            data: { actualCost: serviceCharge + partsCost },
        });

        // ── Webhook: payment.created ──────────────────────────────
        fireWebhooks('payment.created', {
            paymentId: payment.id,
            jobId: payment.jobId,
            serviceCharge: payment.serviceCharge,
            partsCost: payment.partsCost,
            totalBill: payment.totalBill,
            status: payment.status,
            createdAt: payment.createdAt.toISOString(),
        }).catch(err => console.error('[webhook payments] fire error:', err));

        writeAuditLog({
            actor: { id: auth.user.id, name: auth.user.name, role: auth.user.role },
            action: 'create', entity: 'payment', entityId: payment.id,
            meta: { jobId: payment.jobId, serviceCharge, partsCost, totalBill: payment.totalBill, status: payment.status },
        }).catch(() => {});

        return NextResponse.json({
            ...payment,
            createdAt: payment.createdAt.toISOString(),
            updatedAt: payment.updatedAt.toISOString(),
        }, { status: 201 });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'A payment record already exists for this job.' }, { status: 409 });
        }
        console.error('[api/payments POST]', error);
        return NextResponse.json({ error: 'Failed to create payment record.' }, { status: 500 });
    }
}
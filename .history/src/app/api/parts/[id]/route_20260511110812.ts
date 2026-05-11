import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';

// PUT /api/parts/:id — approve/reject a part request; admin or reception only
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireSession(['admin', 'reception']);
    if ('error' in auth) return auth.error;

    try {
        const { id } = await params;
        const body = await request.json();

        if (!body.status || !['Approved', 'Rejected'].includes(body.status)) {
            return NextResponse.json({ error: 'status must be "Approved" or "Rejected".' }, { status: 400 });
        }

        const partRequest = await prisma.partRequest.update({
            where: { id },
            data: {
                status: body.status,
                reviewedAt: new Date(),
            },
        });

        // ── Auto-add parts cost to job estimatedCost on approval ─────────────
        if (body.status === 'Approved' && partRequest.jobId && partRequest.partName) {
            try {
                // Look up the inventory item by name (case-insensitive) to get unit cost
                const inventoryItem = await prisma.inventoryItem.findFirst({
                    where: {
                        name: { equals: partRequest.partName, mode: 'insensitive' },
                    },
                    select: { unitPrice: true },
                });

                const unitCost = inventoryItem?.unitPrice ?? 0;
                const partLineCost = unitCost * (partRequest.quantity ?? 1);

                if (partLineCost > 0) {
                    // Atomically increment estimatedCost so concurrent approvals don't race
                    await prisma.job.update({
                        where: { id: partRequest.jobId },
                        data: {
                            estimatedCost: { increment: partLineCost },
                        },
                    });

                    console.log(
                        `[parts/[id]] Approved part "${partRequest.partName}" ` +
                        `(qty ${partRequest.quantity} × ₹${unitCost} = ₹${partLineCost}) ` +
                        `added to job ${partRequest.jobId} estimatedCost.`
                    );
                } else {
                    console.warn(
                        `[parts/[id]] Approved part "${partRequest.partName}" has no inventory match or zero unit cost — estimatedCost unchanged.`
                    );
                }
            } catch (costErr) {
                // Cost update failure must NOT fail the approval itself
                console.error('[parts/[id]] Failed to update job estimatedCost:', costErr);
            }
        }

        // ── Notify the engineer ───────────────────────────────────────────────
        await prisma.notification.create({
            data: {
                userId: partRequest.engineerId,
                message: `Part request "${partRequest.partName}" has been ${body.status.toLowerCase()}.`,
                jobId: partRequest.jobId,
            },
        });

        return NextResponse.json({
            ...partRequest,
            createdAt: partRequest.createdAt.toISOString(),
            updatedAt: partRequest.updatedAt.toISOString(),
            reviewedAt: partRequest.reviewedAt?.toISOString() ?? undefined,
        });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Part request not found.' }, { status: 404 });
        }
        console.error('[api/parts/[id] PUT]', error);
        return NextResponse.json({ error: 'Failed to update part request.' }, { status: 500 });
    }
}
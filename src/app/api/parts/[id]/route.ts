import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { fireWebhooks } from '@/lib/webhooks';
import { writeAuditLog } from '@/lib/auditLog';

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

        // ── Block approval of requests that are awaiting stock ────────────────
        const existing = await prisma.partRequest.findUnique({ where: { id }, select: { status: true, partName: true } });
        if (existing?.status === 'AwaitingStock') {
            return NextResponse.json(
                { error: 'Cannot approve or reject a part request that is awaiting stock. Stock must be added to inventory first.' },
                { status: 409 }
            );
        }

        // Look up the inventory item by name (case-insensitive) to get unit cost and id
        let unitCost = 0;
        let inventoryItem: { id: string; unitPrice: number; quantity: number } | null = null;

        if (body.status === 'Approved' && existing?.partName) {
            inventoryItem = await prisma.inventoryItem.findFirst({
                where: {
                    name: { equals: existing.partName, mode: 'insensitive' },
                },
                select: { id: true, unitPrice: true, quantity: true },
            });
            if (inventoryItem) {
                unitCost = inventoryItem.unitPrice;
            }
        }

        const partRequest = await prisma.partRequest.update({
            where: { id },
            data: {
                status: body.status,
                reviewedAt: new Date(),
                unitCost: body.status === 'Approved' ? unitCost : null,
            },
        });

        // ── Auto-add parts cost to job estimatedCost on approval ─────────────
        if (body.status === 'Approved' && partRequest.jobId && partRequest.partName) {
            try {
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

                // ── Decrement inventory quantity on approval ──────────────────
                if (inventoryItem) {
                    const deductQty = partRequest.quantity ?? 1;
                    const newQty = Math.max(0, inventoryItem.quantity - deductQty);
                    await prisma.inventoryItem.update({
                        where: { id: inventoryItem.id },
                        data: { quantity: newQty },
                    });
                    console.log(
                        `[parts/[id]] Inventory "${partRequest.partName}" decremented by ${deductQty} ` +
                        `(${inventoryItem.quantity} → ${newQty}).`
                    );
                } else {
                    console.warn(
                        `[parts/[id]] Approved part "${partRequest.partName}" not found in inventory — quantity not decremented.`
                    );
                }
            } catch (costErr) {
                // Cost/inventory update failure must NOT fail the approval itself
                console.error('[parts/[id]] Failed to update job estimatedCost or inventory:', costErr);
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

        // ── Webhook: part.approved / part.rejected ────────────────────────────
        const webhookEvent = body.status === 'Approved' ? 'part.approved' : 'part.rejected';
        fireWebhooks(webhookEvent, {
            partRequestId: partRequest.id,
            jobId: partRequest.jobId,
            engineerId: partRequest.engineerId,
            partName: partRequest.partName,
            quantity: partRequest.quantity,
            status: partRequest.status,
            reviewedAt: partRequest.reviewedAt?.toISOString(),
        }).catch(err => console.error('[webhook parts] fire error:', err));

        writeAuditLog({
            actor: { id: auth.user.id, name: auth.user.name, role: auth.user.role },
            action: body.status === 'Approved' ? 'approve' : 'reject',
            entity: 'partRequest', entityId: id,
            field: 'status', oldValue: existing?.status ?? 'Pending', newValue: body.status,
            meta: { jobId: partRequest.jobId, partName: partRequest.partName },
        }).catch(() => {});

        return NextResponse.json({
            ...partRequest,
            createdAt: partRequest.createdAt.toISOString(),
            updatedAt: partRequest.updatedAt.toISOString(),
            reviewedAt: partRequest.reviewedAt?.toISOString() ?? undefined,
        });
    } catch (error) {
        if (error && typeof error === 'object' && 'code' in error) {
            const err = error as { code: string };
            if (err.code === 'P2025') {
                return NextResponse.json({ error: 'Part request not found.' }, { status: 404 });
            }
        }
        console.error('[api/parts/[id] PUT]', error);
        return NextResponse.json({ error: 'Failed to update part request.' }, { status: 500 });
    }
}
// PATCH /api/parts/:id — internal: promote AwaitingStock → Pending when stock arrives
export async function PATCH(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireSession(['admin', 'reception']);
    if ('error' in auth) return auth.error;

    try {
        const { id } = await params;

        const existing = await prisma.partRequest.findUnique({ where: { id }, select: { status: true } });
        if (!existing) {
            return NextResponse.json({ error: 'Part request not found.' }, { status: 404 });
        }
        if (existing.status !== 'AwaitingStock') {
            return NextResponse.json({ error: 'Only AwaitingStock requests can be promoted.' }, { status: 409 });
        }

        const updated = await prisma.partRequest.update({
            where: { id },
            data: { status: 'Pending' },
        });

        return NextResponse.json({
            ...updated,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
            reviewedAt: updated.reviewedAt?.toISOString() ?? undefined,
        });
    } catch (error) {
        console.error('[api/parts/[id] PATCH]', error);
        return NextResponse.json({ error: 'Failed to promote part request.' }, { status: 500 });
    }
}
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, LIMITS, checkLengths } from '@/lib/auth';

// POST /api/parts — engineers submit part requests; admin/reception may also
export async function POST(request: Request) {
    const auth = await requireSession(['admin', 'reception', 'engineer']);
    if ('error' in auth) return auth.error;

    try {
        const body = await request.json();

        if (!body.jobId || !body.engineerId || !body.partName || !body.quantity || !body.reason) {
            return NextResponse.json(
                { error: 'jobId, engineerId, partName, quantity and reason are required.' },
                { status: 400 }
            );
        }

        // Input length caps
        const lengthError = checkLengths([
            [body.partName, 'partName', LIMITS.shortText],
            [body.reason, 'reason', LIMITS.text],
        ]);
        if (lengthError) {
            return NextResponse.json({ error: lengthError }, { status: 400 });
        }

        // Engineers can only submit requests for themselves
        if (auth.user.role === 'engineer' && body.engineerId !== auth.user.id) {
            return NextResponse.json(
                { error: 'Engineers may only submit part requests for themselves.' },
                { status: 403 }
            );
        }

        const partRequest = await prisma.partRequest.create({
            data: {
                jobId: body.jobId,
                engineerId: body.engineerId,
                partName: body.partName.trim(),
                quantity: Number(body.quantity),
                reason: body.reason.trim(),
                status: 'Pending',
            },
        });

        // ── Check inventory availability ──────────────────────────────────────
        let inventoryStatus: 'available' | 'low_stock' | 'out_of_stock' | 'not_found' = 'not_found';
        let inventoryQuantity: number | undefined;
        let inventoryMinStock: number | undefined;
        let shouldAwaitStock = false;

        try {
            const inventoryItem = await prisma.inventoryItem.findFirst({
                where: { name: { equals: partRequest.partName, mode: 'insensitive' } },
                select: { quantity: true, minQuantity: true },
            });

            if (inventoryItem) {
                inventoryQuantity = inventoryItem.quantity;
                inventoryMinStock = inventoryItem.minQuantity;
                const requested = Number(body.quantity);
                if (inventoryItem.quantity <= 0) {
                    inventoryStatus = 'out_of_stock';
                    shouldAwaitStock = true;
                } else if (inventoryItem.quantity < inventoryItem.minQuantity || inventoryItem.quantity < requested) {
                    inventoryStatus = 'low_stock';
                    // low_stock still goes to Pending — admin decides
                } else {
                    inventoryStatus = 'available';
                }
            } else {
                // part not in inventory catalogue at all
                shouldAwaitStock = true;
            }
        } catch (invErr) {
            console.warn('[api/parts POST] Could not check inventory:', invErr);
        }

        // ── If part is unavailable, move to AwaitingStock ─────────────────────
        let finalRequest = partRequest;
        if (shouldAwaitStock) {
            finalRequest = await prisma.partRequest.update({
                where: { id: partRequest.id },
                data: { status: 'AwaitingStock' },
            });
        }

        return NextResponse.json({
            ...finalRequest,
            createdAt: finalRequest.createdAt.toISOString(),
            updatedAt: finalRequest.updatedAt.toISOString(),
            reviewedAt: finalRequest.reviewedAt?.toISOString() ?? undefined,
            inventoryStatus,
            inventoryQuantity,
            inventoryMinStock,
        }, { status: 201 });
    } catch (error) {
        console.error('[api/parts POST]', error);
        return NextResponse.json({ error: 'Failed to create part request.' }, { status: 500 });
    }
}
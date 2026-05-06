import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, LIMITS, checkLengths } from '@/lib/auth';

// Helper: normalise DB row → frontend InventoryItem shape
function mapItem(i: any) {
    return {
        ...i,
        unitCost: i.unitPrice,
        minStock: i.minQuantity,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
    };
}

// POST /api/inventory — admin or reception only
export async function POST(request: Request) {
    const auth = await requireSession(['admin', 'reception']);
    if ('error' in auth) return auth.error;

    try {
        const body = await request.json();

        if (!body.name || !body.category || body.unitCost === undefined) {
            return NextResponse.json(
                { error: 'name, category and unitCost are required.' },
                { status: 400 }
            );
        }

        // Input length caps
        const lengthError = checkLengths([
            [body.name, 'name', LIMITS.name],
            [body.category, 'category', LIMITS.shortText],
            [body.sku, 'sku', LIMITS.shortText],
            [body.location, 'location', LIMITS.shortText],
        ]);
        if (lengthError) {
            return NextResponse.json({ error: lengthError }, { status: 400 });
        }

        const sku = body.sku || `SKU-${body.name.replace(/\s+/g, '-').toUpperCase()}-${Date.now()}`;

        const item = await prisma.inventoryItem.create({
            data: {
                name: body.name.trim(),
                sku,
                category: body.category.trim(),
                quantity: Number(body.quantity) || 0,
                minQuantity: Number(body.minStock) || 5,
                unitPrice: parseFloat(body.unitCost),
                location: body.location?.trim() || null,
            },
        });

        return NextResponse.json(mapItem(item), { status: 201 });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'An item with this SKU already exists.' }, { status: 409 });
        }
        console.error('[api/inventory POST]', error);
        return NextResponse.json({ error: 'Failed to add inventory item.' }, { status: 500 });
    }
}

// PUT /api/inventory — admin or reception only
export async function PUT(request: Request) {
    const auth = await requireSession(['admin', 'reception']);
    if ('error' in auth) return auth.error;

    try {
        const body = await request.json();

        if (!body.id || body.quantity === undefined) {
            return NextResponse.json({ error: 'id and quantity are required.' }, { status: 400 });
        }

        const qty = Number(body.quantity);
        if (!Number.isFinite(qty) || qty < 0) {
            return NextResponse.json(
                { error: `quantity must be a non-negative number, received: ${JSON.stringify(body.quantity)}` },
                { status: 400 }
            );
        }

        const item = await prisma.inventoryItem.update({
            where: { id: body.id },
            data: { quantity: Math.round(qty) },
        });

        return NextResponse.json(mapItem(item));
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Inventory item not found.' }, { status: 404 });
        }
        console.error('[api/inventory PUT]', error);
        return NextResponse.json({ error: 'Failed to update inventory.' }, { status: 500 });
    }
}

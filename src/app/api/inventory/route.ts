import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, LIMITS, checkLengths } from '@/lib/auth';
import { writeAuditLog } from '@/lib/auditLog';
import { rateLimiter, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';
import type { InventoryItem, Prisma } from '@prisma/client';

// Helper: normalise DB row → frontend InventoryItem shape
function mapItem(i: InventoryItem) {
    return {
        ...i,
        unitCost: i.unitPrice,
        minStock: i.minQuantity,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
    };
}

// ── Rate-limit helper shared by all handlers ────────────────────────────────
async function checkRateLimit(request: Request, userId: string) {
    const ip = getClientIP(request);
    return rateLimiter.check(`api:inventory:${userId}:${ip}`, RATE_LIMITS.MODERATE);
}

// GET /api/inventory — admin, reception, engineer
export async function GET(request: Request) {
    const auth = await requireSession(['admin', 'reception', 'engineer']);
    if ('error' in auth) return auth.error;

    const limitCheck = await checkRateLimit(request, auth.user.id);
    if (limitCheck.isLimited) {
        return NextResponse.json(
            { error: `Too many requests. Try again in ${limitCheck.retryAfter} seconds.` },
            { status: 429, headers: { 'Retry-After': limitCheck.retryAfter.toString() } }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
        const search = searchParams.get('search')?.trim() || '';
        const category = searchParams.get('category')?.trim() || '';

        const where: Prisma.InventoryItemWhereInput = {};
        if (category && category !== 'All') {
            where.category = category;
        }
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { category: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [items, total, categoriesResult, lowStockCountResult, totalValueResult, criticalItemsResult] = await Promise.all([
            prisma.inventoryItem.findMany({
                where,
                orderBy: { name: 'asc' },
                take: limit,
                skip: (page - 1) * limit,
            }),
            prisma.inventoryItem.count({ where }),
            prisma.inventoryItem.groupBy({
                by: ['category'],
                orderBy: { category: 'asc' },
            }),
            prisma.$queryRaw<Array<{count: bigint}>>`SELECT COUNT(*) as count FROM "InventoryItem" WHERE "quantity" <= "minQuantity"`,
            prisma.$queryRaw<Array<{sum: number}>>`SELECT SUM("quantity" * "unitPrice") as sum FROM "InventoryItem"`,
            prisma.$queryRaw<InventoryItem[]>`SELECT * FROM "InventoryItem" WHERE "quantity" <= "minQuantity" LIMIT 20`,
        ]);

        const lowStockCount = Number(lowStockCountResult?.[0]?.count ?? 0);
        const totalValue = Number(totalValueResult?.[0]?.sum ?? 0);

        return NextResponse.json({
            inventory: items.map(mapItem),
            total,
            page,
            limit,
            categories: ['All', ...categoriesResult.map(c => c.category)],
            metrics: {
                totalItems: await prisma.inventoryItem.count(),
                lowStockCount,
                totalValue,
            },
            criticalItems: (criticalItemsResult ?? []).map(mapItem),
        });
    } catch (error) {
        console.error('[api/inventory GET]', error);
        return NextResponse.json({ error: 'Failed to fetch inventory.' }, { status: 500 });
    }
}

// POST /api/inventory — admin or reception only
export async function POST(request: Request) {
    const auth = await requireSession(['admin', 'reception']);
    if ('error' in auth) return auth.error;

    const limit = await checkRateLimit(request, auth.user.id);
    if (limit.isLimited) {
        return NextResponse.json(
            { error: `Too many requests. Try again in ${limit.retryAfter} seconds.` },
            { status: 429, headers: { 'Retry-After': limit.retryAfter.toString() } }
        );
    }

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

        writeAuditLog({
            actor: { id: auth.user.id, name: auth.user.name, role: auth.user.role },
            action: 'create', entity: 'inventory', entityId: item.id,
            meta: { name: item.name, sku: item.sku, quantity: item.quantity, unitPrice: item.unitPrice },
        }).catch(() => {});

        return NextResponse.json(mapItem(item), { status: 201 });
    } catch (error) {
        if (error && typeof error === 'object' && 'code' in error) {
            const err = error as { code: string };
            if (err.code === 'P2002') {
                return NextResponse.json({ error: 'An item with this SKU already exists.' }, { status: 409 });
            }
        }
        console.error('[api/inventory POST]', error);
        return NextResponse.json({ error: 'Failed to add inventory item.' }, { status: 500 });
    }
}

// PUT /api/inventory — admin or reception only
export async function PUT(request: Request) {
    const auth = await requireSession(['admin', 'reception']);
    if ('error' in auth) return auth.error;

    const limit = await checkRateLimit(request, auth.user.id);
    if (limit.isLimited) {
        return NextResponse.json(
            { error: `Too many requests. Try again in ${limit.retryAfter} seconds.` },
            { status: 429, headers: { 'Retry-After': limit.retryAfter.toString() } }
        );
    }

    try {
        const body = await request.json();

        if (!body.id) {
            return NextResponse.json({ error: 'id is required.' }, { status: 400 });
        }

        // Full edit (price + minStock) mode
        if (body.unitCost !== undefined || body.minStock !== undefined) {
            const updateData: Prisma.InventoryItemUpdateInput = {};
            if (body.unitCost !== undefined) {
                const cost = parseFloat(body.unitCost);
                if (!Number.isFinite(cost) || cost < 0) {
                    return NextResponse.json({ error: 'unitCost must be a non-negative number.' }, { status: 400 });
                }
                updateData.unitPrice = cost;
            }
            if (body.minStock !== undefined) {
                const min = Number(body.minStock);
                if (!Number.isFinite(min) || min < 0) {
                    return NextResponse.json({ error: 'minStock must be a non-negative number.' }, { status: 400 });
                }
                updateData.minQuantity = Math.round(min);
            }

            const item = await prisma.inventoryItem.update({
                where: { id: body.id },
                data: updateData,
            });

            writeAuditLog({
                actor: { id: auth.user.id, name: auth.user.name, role: auth.user.role },
                action: 'update', entity: 'inventory', entityId: item.id,
                meta: { name: item.name, ...updateData },
            }).catch(() => {});

            return NextResponse.json(mapItem(item));
        }

        // Stock quantity update mode
        if (body.quantity === undefined) {
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

        writeAuditLog({
            actor: { id: auth.user.id, name: auth.user.name, role: auth.user.role },
            action: 'update', entity: 'inventory', entityId: item.id,
            field: 'quantity', newValue: item.quantity,
            meta: { name: item.name },
        }).catch(() => {});

        return NextResponse.json(mapItem(item));
    } catch (error) {
        if (error && typeof error === 'object' && 'code' in error) {
            const err = error as { code: string };
            if (err.code === 'P2025') {
                return NextResponse.json({ error: 'Inventory item not found.' }, { status: 404 });
            }
        }
        console.error('[api/inventory PUT]', error);
        return NextResponse.json({ error: 'Failed to update inventory.' }, { status: 500 });
    }
}

// DELETE /api/inventory — admin only
export async function DELETE(request: Request) {
    const auth = await requireSession(['admin']);
    if ('error' in auth) return auth.error;

    const limit = await checkRateLimit(request, auth.user.id);
    if (limit.isLimited) {
        return NextResponse.json(
            { error: `Too many requests. Try again in ${limit.retryAfter} seconds.` },
            { status: 429, headers: { 'Retry-After': limit.retryAfter.toString() } }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'id query param is required.' }, { status: 400 });
        }

        const item = await prisma.inventoryItem.delete({ where: { id } });

        writeAuditLog({
            actor: { id: auth.user.id, name: auth.user.name, role: auth.user.role },
            action: 'delete', entity: 'inventory', entityId: id,
            meta: { name: item.name },
        }).catch(() => {});

        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error && typeof error === 'object' && 'code' in error) {
            const err = error as { code: string };
            if (err.code === 'P2025') {
                return NextResponse.json({ error: 'Inventory item not found.' }, { status: 404 });
            }
        }
        console.error('[api/inventory DELETE]', error);
        return NextResponse.json({ error: 'Failed to delete inventory item.' }, { status: 500 });
    }
}
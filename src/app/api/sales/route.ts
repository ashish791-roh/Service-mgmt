import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { rateLimiter, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';
import { validateBody, SaleCreateSchema } from '@/lib/validation';
import type { Prisma, SaleItem } from '@prisma/client';

type SaleWithItems = Prisma.SaleGetPayload<{ include: { items: true } }>;

// ── Generate next sale number ─────────────────────────────────────
async function nextSaleNumber(): Promise<string> {
    const count = await prisma.sale.count();
    return `SALE-${String(count + 1).padStart(5, '0')}`;
}

// ── Map a Prisma Sale row with items → frontend shape ─────────────
function mapSale(s: SaleWithItems) {
    return {
        id: s.id,
        saleNumber: s.saleNumber,
        customerId: s.customerId ?? null,
        companyName: s.companyName ?? '',
        contactName: s.contactName ?? '',
        phone: s.phone ?? '',
        notes: s.notes ?? '',
        totalAmount: s.totalAmount,
        paidAt: s.paidAt ? s.paidAt.toISOString() : null,
        createdById: s.createdById,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        items: (s.items ?? []).map((i: SaleItem) => ({
            id: i.id,
            saleId: i.saleId,
            inventoryItemId: i.inventoryItemId,
            itemName: i.itemName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            subtotal: i.subtotal,
        })),
    };
}

// ── GET /api/sales — admin or reception ──────────────────────────
export async function GET(request: Request) {
    const auth = await requireSession(request, ['admin', 'reception']);
    if ('error' in auth) return auth.error;

    // ── Rate limiting ─────────────────────────────────────────────
    const ip = getClientIP(request);
    const limitCheck = await rateLimiter.check(
        `api:sales:get:${auth.user.id}:${ip}`,
        RATE_LIMITS.LENIENT
    );
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

        const where: Prisma.SaleWhereInput = {};
        if (search) {
            where.OR = [
                { saleNumber: { contains: search, mode: 'insensitive' } },
                { companyName: { contains: search, mode: 'insensitive' } },
                { contactName: { contains: search, mode: 'insensitive' } },
            ];
        }

        const todayStart = new Date();
        todayStart.setHours(0,0,0,0);

        const [sales, total, totalRevenueResult, todaySalesResult] = await Promise.all([
            prisma.sale.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: (page - 1) * limit,
                include: { items: true },
            }),
            prisma.sale.count({ where }),
            prisma.sale.aggregate({
                _sum: { totalAmount: true },
            }),
            prisma.sale.findMany({
                where: {
                    createdAt: {
                        gte: todayStart,
                    }
                },
                select: { totalAmount: true },
            }),
        ]);

        const totalRevenue = totalRevenueResult._sum.totalAmount ?? 0;
        const todaySalesCount = todaySalesResult.length;
        const todayRevenue = todaySalesResult.reduce((sum: number, s: { totalAmount: number }) => sum + (s.totalAmount ?? 0), 0);

        return NextResponse.json({
            sales: sales.map(mapSale),
            total,
            page,
            limit,
            metrics: {
                totalRevenue,
                todaySalesCount,
                todayRevenue,
            }
        });
    } catch (error) {
        console.error('[api/sales GET]', error);
        return NextResponse.json({ error: 'Failed to fetch sales.' }, { status: 500 });
    }
}

// ── POST /api/sales — admin or reception ─────────────────────────
export async function POST(request: Request) {
    const auth = await requireSession(request, ['admin', 'reception']);
    if ('error' in auth) return auth.error;

    // ── Rate limiting ─────────────────────────────────────────────
    const ip = getClientIP(request);
    const limitCheck = await rateLimiter.check(
        `api:sales:post:${auth.user.id}:${ip}`,
        RATE_LIMITS.MODERATE
    );
    if (limitCheck.isLimited) {
        return NextResponse.json(
            { error: `Too many requests. Try again in ${limitCheck.retryAfter} seconds.` },
            { status: 429, headers: { 'Retry-After': limitCheck.retryAfter.toString() } }
        );
    }

    try {
        const validation = await validateBody(request, SaleCreateSchema);
        if (!validation.success) return validation.errorResponse;
        const body = validation.data;

        const itemIds = body.items.map(i => i.inventoryItemId);
        const inventoryRows = await prisma.inventoryItem.findMany({
            where: { id: { in: itemIds } },
        });

        // Check stock
        const stockErrors: string[] = [];
        for (const lineItem of body.items) {
            const inv = inventoryRows.find(r => r.id === lineItem.inventoryItemId);
            if (!inv) {
                stockErrors.push(`Inventory item ${lineItem.inventoryItemId} not found.`);
                continue;
            }
            if (inv.quantity < lineItem.quantity) {
                stockErrors.push(
                    `Insufficient stock for "${inv.name}": available ${inv.quantity}, requested ${lineItem.quantity}.`
                );
            }
        }
        if (stockErrors.length > 0) {
            return NextResponse.json({ error: stockErrors.join(' ') }, { status: 409 });
        }

        const saleNumber = await nextSaleNumber();
        let totalAmount = 0;
        const lineData = body.items.map(li => {
            const inv = inventoryRows.find(r => r.id === li.inventoryItemId)!;
            const qty = li.quantity;
            let unitPrice: number;
            if (auth.user.role === 'admin' && li.unitPrice !== undefined && li.unitPrice !== null) {
                unitPrice = li.unitPrice;
            } else {
                unitPrice = Number(inv.unitPrice);
            }
            const subtotal = unitPrice * qty;
            totalAmount += subtotal;
            return {
                inventoryItemId: inv.id,
                itemName: inv.name,
                quantity: qty,
                unitPrice,
                subtotal,
            };
        });

        // Create Sale with items inside a single Prisma Transaction
        const createdSale = await prisma.$transaction(async (tx) => {
            const sale = await tx.sale.create({
                data: {
                    saleNumber,
                    customerId: body.customerId ?? null,
                    companyName: body.companyName,
                    contactName: body.contactName,
                    phone: body.phone,
                    notes: body.notes,
                    totalAmount,
                    createdById: auth.user.id,
                    items: {
                        create: lineData.map(item => ({
                            inventoryItemId: item.inventoryItemId,
                            itemName: item.itemName,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            subtotal: item.subtotal,
                        })),
                    },
                },
                include: { items: true },
            });

            // Deduct stock
            for (const item of lineData) {
                await tx.inventoryItem.update({
                    where: { id: item.inventoryItemId },
                    data: { quantity: { decrement: item.quantity } },
                });
            }

            return sale;
        });

        // Low stock alerts
        const adminUsers = await prisma.user.findMany({ where: { role: 'admin' } });
        const receptionUsers = await prisma.user.findMany({ where: { role: 'reception' } });
        const notifyUsers = [...adminUsers, ...receptionUsers];

        for (const item of createdSale.items) {
            const inv = inventoryRows.find(r => r.id === item.inventoryItemId)!;
            const newQty = inv.quantity - item.quantity;

            if (newQty <= inv.minQuantity) {
                const notifMessage = newQty <= 0
                    ? `⚠️ OUT OF STOCK: "${inv.name}" (SKU: ${inv.sku}) — 0 units remaining after sale ${saleNumber}.`
                    : `⚠️ Low Stock Alert: "${inv.name}" (SKU: ${inv.sku}) — only ${newQty} unit(s) left (min: ${inv.minQuantity}) after sale ${saleNumber}.`;

                await Promise.all(
                    notifyUsers.map(u =>
                        prisma.notification.create({
                            data: {
                                userId: u.id,
                                message: notifMessage,
                            },
                        })
                    )
                );
            }
        }

        return NextResponse.json(mapSale(createdSale), { status: 201 });
    } catch (error) {
        console.error('[api/sales POST]', error);
        return NextResponse.json({ error: 'Failed to create sale.' }, { status: 500 });
    }
}

// ── PATCH /api/sales — mark a sale as paid ────────────────────────
export async function PATCH(request: Request) {
    const auth = await requireSession(request, ['admin', 'reception']);
    if ('error' in auth) return auth.error;

    const ip = getClientIP(request);
    const limitCheck = await rateLimiter.check(
        `api:sales:patch:${auth.user.id}:${ip}`,
        RATE_LIMITS.MODERATE
    );
    if (limitCheck.isLimited) {
        return NextResponse.json(
            { error: `Too many requests. Try again in ${limitCheck.retryAfter} seconds.` },
            { status: 429, headers: { 'Retry-After': limitCheck.retryAfter.toString() } }
        );
    }

    try {
        const body = await request.json();
        if (!body.saleId) {
            return NextResponse.json({ error: 'saleId is required.' }, { status: 400 });
        }

        const sale = await prisma.sale.findUnique({
            where: { id: body.saleId },
        });

        if (!sale) {
            return NextResponse.json({ error: 'Sale not found.' }, { status: 404 });
        }
        if (sale.paidAt) {
            return NextResponse.json({ error: 'Sale is already marked as paid.' }, { status: 409 });
        }

        const updated = await prisma.sale.update({
            where: { id: body.saleId },
            data: { paidAt: new Date() },
            include: { items: true },
        });

        return NextResponse.json(mapSale(updated));
    } catch (error) {
        console.error('[api/sales PATCH]', error);
        return NextResponse.json({ error: 'Failed to mark sale as paid.' }, { status: 500 });
    }
}
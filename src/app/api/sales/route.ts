import { NextResponse } from 'next/server';
import { addToTallyQueue } from '@/lib/tallyQueue';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { rateLimiter, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';
import { validateBody, SaleCreateSchema } from '@/lib/validation';
import type { Prisma, SaleItem } from '@prisma/client';
import { captureChange } from '@/lib/branchSync';
import { withLocalBranchId } from '@/lib/branchContext';
import { writeAuditLog } from '@/lib/auditLog';


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

        const [sales, total] = await Promise.all([
            prisma.sale.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: (page - 1) * limit,
                include: { items: true },
            }),
            prisma.sale.count({ where }),
        ]);

        // Fetch metrics only on page 1 (first load) — pass ?metrics=1 from the client
        // when page === 1, skip on subsequent pages to avoid the expensive aggregates.
        const wantMetrics = searchParams.get('metrics') !== '0';
        let totalRevenue = 0, todaySalesCount = 0, todayRevenue = 0;

        if (wantMetrics) {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const [rev, today] = await Promise.all([
                prisma.sale.aggregate({ _sum: { totalAmount: true } }),
                prisma.sale.aggregate({
                    where: { createdAt: { gte: todayStart } },
                    _sum: { totalAmount: true },
                    _count: { id: true },
                }),
            ]);
            totalRevenue = rev._sum.totalAmount ?? 0;
            todaySalesCount = today._count.id ?? 0;
            todayRevenue = today._sum.totalAmount ?? 0;
        }

        const saleIds = sales.map((s: any) => s.id);
        const queueItems = saleIds.length > 0 && prisma.tallyQueueItem
            ? await prisma.tallyQueueItem.findMany({
                where: {
                    entityType: 'sale',
                    entityId: { in: saleIds },
                },
                select: {
                    entityId: true,
                    status: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            })
            : [];

        const statusMap = new Map<string, string>();
        for (const item of queueItems) {
            if (!statusMap.has(item.entityId)) {
                statusMap.set(item.entityId, item.status);
            }
        }

        return NextResponse.json({
            sales: sales.map((s: any) => ({
                ...mapSale(s),
                tallyStatus: statusMap.get(s.id) || null,
            })),
            total,
            page,
            limit,
            metrics: {
                totalRevenue,
                todaySalesCount,
                todayRevenue,
            }
        }, {
            headers: {
                'Cache-Control': 'private, max-age=15, stale-while-revalidate=30',
            },
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

        const itemIds = body.items.map((i: any) => i.inventoryItemId);
        const inventoryRows = await prisma.inventoryItem.findMany({
            where: { id: { in: itemIds } },
        });

        // Check stock
        const stockErrors: string[] = [];
        for (const lineItem of body.items) {
            const inv = inventoryRows.find((r: any) => r.id === lineItem.inventoryItemId);
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
        const lineData = body.items.map((li: any) => {
            const inv = inventoryRows.find((r: any) => r.id === li.inventoryItemId)!;
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
        const { sale: createdSale, updatedInventoryItems } = await prisma.$transaction(async (tx: any) => {
            const sale = await tx.sale.create({
                data: withLocalBranchId({
                    saleNumber,
                    customerId: body.customerId ?? null,
                    companyName: body.companyName,
                    contactName: body.contactName,
                    phone: body.phone,
                    notes: body.notes,
                    totalAmount,
                    createdById: auth.user.id,
                    items: {
                        create: lineData.map((item: any) => withLocalBranchId({
                            inventoryItemId: item.inventoryItemId,
                            itemName: item.itemName,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            subtotal: item.subtotal,
                        })),
                    },
                }),
                include: { items: true },
            });

            // Deduct stock
            const inventoryUpdates = [];
            for (const item of lineData) {
                const updated = await tx.inventoryItem.update({
                    where: { id: item.inventoryItemId },
                    data: { quantity: { decrement: item.quantity } },
                });
                inventoryUpdates.push(updated);
            }

            return { sale, updatedInventoryItems: inventoryUpdates };
        });

        // ── Outbox Sync ──────────────────────────────────────────────
        captureChange({
            entityType: 'Sale',
            entityId: createdSale.id,
            action: 'create',
            payload: createdSale,
        }).catch(err => console.error('[SyncOutbox] Sale create error:', err));

        if (createdSale.items) {
            for (const item of createdSale.items) {
                captureChange({
                    entityType: 'SaleItem',
                    entityId: item.id,
                    action: 'create',
                    payload: item,
                }).catch(err => console.error('[SyncOutbox] SaleItem create error:', err));
            }
        }

        for (const invItem of updatedInventoryItems) {
            captureChange({
                entityType: 'InventoryItem',
                entityId: invItem.id,
                action: 'update',
                payload: invItem,
            }).catch(err => console.error('[SyncOutbox] InventoryItem update error:', err));
        }


        // Queue Tally Sync Voucher
        await addToTallyQueue({
            entityType: 'sale',
            entityId: createdSale.id,
            actionType: 'sync_invoice',
            priority: 0,
        }).catch(err => console.error('[Tally Auto-Queue Counter Sale] Failed:', err));

        // Low stock alerts
        const adminUsers = await prisma.user.findMany({ where: { role: 'admin' } });
        const receptionUsers = await prisma.user.findMany({ where: { role: 'reception' } });
        const notifyUsers = [...adminUsers, ...receptionUsers];

        for (const item of createdSale.items) {
            const inv = inventoryRows.find((r: any) => r.id === item.inventoryItemId)!;
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

        // ── Audit log — sale created ────────────────────────────
        writeAuditLog({
            actor: { id: auth.user.id, name: auth.user.name, role: auth.user.role },
            action: 'create', entity: 'sale', entityId: createdSale.id,
            meta: { saleNumber: createdSale.saleNumber, totalAmount: createdSale.totalAmount, itemsCount: createdSale.items?.length ?? 0 },
        }).catch(() => { });

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

        // ── Outbox Sync ──────────────────────────────────────────────
        captureChange({
            entityType: 'Sale',
            entityId: updated.id,
            action: 'update',
            payload: updated,
        }).catch(err => console.error('[SyncOutbox] Sale update error:', err));


        // ── Audit log — sale marked as paid ─────────────────────────
        writeAuditLog({
            actor: { id: auth.user.id, name: auth.user.name, role: auth.user.role },
            action: 'update', entity: 'sale', entityId: updated.id, field: 'paidAt',
            oldValue: sale.paidAt ? sale.paidAt.toISOString() : null,
            newValue: updated.paidAt ? updated.paidAt.toISOString() : null,
        }).catch(() => {});

        return NextResponse.json(mapSale(updated));
    } catch (error) {
        console.error('[api/sales PATCH]', error);
        return NextResponse.json({ error: 'Failed to mark sale as paid.' }, { status: 500 });
    }
}
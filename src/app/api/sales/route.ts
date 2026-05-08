import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, LIMITS, checkLengths } from '@/lib/auth';

// ── Ensure sales tables exist (idempotent) ────────────────────────
async function ensureSalesTables() {
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Sale" (
            "id"          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
            "saleNumber"  TEXT        NOT NULL,
            "customerId"  TEXT,
            "companyName" TEXT,
            "contactName" TEXT,
            "phone"       TEXT,
            "notes"       TEXT,
            "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
            "createdById" TEXT        NOT NULL,
            "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
        )
    `);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "SaleItem" (
            "id"              TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
            "saleId"          TEXT         NOT NULL,
            "inventoryItemId" TEXT         NOT NULL,
            "itemName"        TEXT         NOT NULL,
            "quantity"        INTEGER      NOT NULL,
            "unitPrice"       DOUBLE PRECISION NOT NULL,
            "subtotal"        DOUBLE PRECISION NOT NULL,
            CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "SaleItem_saleId_fkey"
                FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE
        )
    `);

    // Unique index on saleNumber
    await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "Sale_saleNumber_key" ON "Sale"("saleNumber")
    `);
}

// ── Generate next sale number ─────────────────────────────────────
async function nextSaleNumber(): Promise<string> {
    const rows = await prisma.$queryRawUnsafe<{ cnt: string }[]>(
        `SELECT COUNT(*) AS cnt FROM "Sale"`
    );
    const n = parseInt(rows[0]?.cnt ?? '0', 10) + 1;
    return `SALE-${String(n).padStart(5, '0')}`;
}

// ── Map a raw Sale row → frontend shape ───────────────────────────
function mapSale(s: any, items: any[] = []): any {
    return {
        id: s.id,
        saleNumber: s.saleNumber,
        customerId: s.customerId ?? null,
        companyName: s.companyName ?? '',
        contactName: s.contactName ?? '',
        phone: s.phone ?? '',
        notes: s.notes ?? '',
        totalAmount: Number(s.totalAmount),
        createdById: s.createdById,
        createdAt: s.createdAt instanceof Date
            ? s.createdAt.toISOString()
            : String(s.createdAt),
        updatedAt: s.updatedAt instanceof Date
            ? s.updatedAt.toISOString()
            : String(s.updatedAt),
        items: items.map(i => ({
            id: i.id,
            saleId: i.saleId,
            inventoryItemId: i.inventoryItemId,
            itemName: i.itemName,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            subtotal: Number(i.subtotal),
        })),
    };
}

// ── GET /api/sales — admin or reception ──────────────────────────
export async function GET() {
    const auth = await requireSession(['admin', 'reception']);
    if ('error' in auth) return auth.error;

    try {
        await ensureSalesTables();

        const sales = await prisma.$queryRawUnsafe<any[]>(
            `SELECT * FROM "Sale" ORDER BY "createdAt" DESC`
        );
        const saleIds = sales.map(s => s.id);

        let allItems: any[] = [];
        if (saleIds.length > 0) {
            allItems = await prisma.$queryRawUnsafe<any[]>(
                `SELECT * FROM "SaleItem" WHERE "saleId" = ANY($1::text[])`,
                saleIds
            );
        }

        const itemsBySale = allItems.reduce((acc: any, i: any) => {
            acc[i.saleId] = acc[i.saleId] || [];
            acc[i.saleId].push(i);
            return acc;
        }, {} as Record<string, any[]>);

        return NextResponse.json(
            sales.map(s => mapSale(s, itemsBySale[s.id] ?? []))
        );
    } catch (error) {
        console.error('[api/sales GET]', error);
        return NextResponse.json({ error: 'Failed to fetch sales.' }, { status: 500 });
    }
}

// ── POST /api/sales — admin or reception ─────────────────────────
// Body: { companyName, contactName, phone, notes, customerId?, items: [{inventoryItemId, quantity}] }
export async function POST(request: Request) {
    const auth = await requireSession(['admin', 'reception']);
    if ('error' in auth) return auth.error;

    try {
        await ensureSalesTables();

        const body = await request.json();

        if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
            return NextResponse.json(
                { error: 'At least one item is required.' },
                { status: 400 }
            );
        }

        // Validate lengths
        const lengthError = checkLengths([
            [body.companyName, 'companyName', LIMITS.name],
            [body.contactName, 'contactName', LIMITS.name],
            [body.notes, 'notes', LIMITS.notes],
        ]);
        if (lengthError) {
            return NextResponse.json({ error: lengthError }, { status: 400 });
        }

        // Validate each line item has valid qty
        for (const item of body.items) {
            if (!item.inventoryItemId) {
                return NextResponse.json({ error: 'Each item must have inventoryItemId.' }, { status: 400 });
            }
            const qty = Number(item.quantity);
            if (!Number.isFinite(qty) || qty < 1) {
                return NextResponse.json({ error: 'Item quantity must be at least 1.' }, { status: 400 });
            }
        }

        // Fetch current inventory for all requested items
        const itemIds: string[] = body.items.map((i: any) => i.inventoryItemId);
        const inventoryRows = await prisma.inventoryItem.findMany({
            where: { id: { in: itemIds } },
        });

        // Check stock availability
        const stockErrors: string[] = [];
        for (const lineItem of body.items) {
            const inv = inventoryRows.find(r => r.id === lineItem.inventoryItemId);
            if (!inv) {
                stockErrors.push(`Inventory item ${lineItem.inventoryItemId} not found.`);
                continue;
            }
            if (inv.quantity < Number(lineItem.quantity)) {
                stockErrors.push(
                    `Insufficient stock for "${inv.name}": available ${inv.quantity}, requested ${lineItem.quantity}.`
                );
            }
        }
        if (stockErrors.length > 0) {
            return NextResponse.json({ error: stockErrors.join(' ') }, { status: 409 });
        }

        // Generate sale number
        const saleNumber = await nextSaleNumber();

        // Compute total
        let totalAmount = 0;
        const lineData = body.items.map((li: any) => {
            const inv = inventoryRows.find(r => r.id === li.inventoryItemId)!;
            const qty = Number(li.quantity);
            const unitPrice = Number(inv.unitPrice);
            const subtotal = unitPrice * qty;
            totalAmount += subtotal;
            return { inv, qty, unitPrice, subtotal };
        });

        // Insert Sale row
        const saleId = crypto.randomUUID();
        await prisma.$executeRawUnsafe(
            `INSERT INTO "Sale" ("id","saleNumber","customerId","companyName","contactName","phone","notes","totalAmount","createdById","createdAt","updatedAt")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
            saleId,
            saleNumber,
            body.customerId ?? null,
            (body.companyName ?? '').trim(),
            (body.contactName ?? '').trim(),
            (body.phone ?? '').trim(),
            (body.notes ?? '').trim(),
            totalAmount,
            auth.user.id,
        );

        // Insert SaleItem rows
        for (const { inv, qty, unitPrice, subtotal } of lineData) {
            const siId = crypto.randomUUID();
            await prisma.$executeRawUnsafe(
                `INSERT INTO "SaleItem" ("id","saleId","inventoryItemId","itemName","quantity","unitPrice","subtotal")
                 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                siId, saleId, inv.id, inv.name, qty, unitPrice, subtotal,
            );
        }

        // Deduct inventory and check low stock (threshold = inv.minQuantity per item)
        const adminUsers = await prisma.user.findMany({ where: { role: 'admin' } });

        for (const { inv, qty } of lineData) {
            const newQty = inv.quantity - qty;

            await prisma.inventoryItem.update({
                where: { id: inv.id },
                data: { quantity: newQty },
            });

            // Low-stock notification to all admins + reception
            if (newQty <= inv.minQuantity) {
                const receptionUsers = await prisma.user.findMany({ where: { role: 'reception' } });
                const notifyUsers = [...adminUsers, ...receptionUsers];

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

        // Fetch the created sale + items to return
        const [createdSale] = await prisma.$queryRawUnsafe<any[]>(
            `SELECT * FROM "Sale" WHERE "id" = $1`, saleId
        );
        const createdItems = await prisma.$queryRawUnsafe<any[]>(
            `SELECT * FROM "SaleItem" WHERE "saleId" = $1`, saleId
        );

        return NextResponse.json(mapSale(createdSale, createdItems), { status: 201 });
    } catch (error: any) {
        if (error.code === '23505') {
            return NextResponse.json({ error: 'A sale with this number already exists.' }, { status: 409 });
        }
        console.error('[api/sales POST]', error);
        return NextResponse.json({ error: 'Failed to create sale.' }, { status: 500 });
    }
}
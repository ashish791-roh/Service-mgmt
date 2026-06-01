import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { rateLimiter, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';

// ── Mappers ───────────────────────────────────────────────────────

function mapJob(j: any) {
    return {
        ...j,
        problemDescription: j.problemDesc,
        assignedEngineerId: j.engineerId,
        estimatedCost: j.estimatedCost ?? 0,
        advanceAmount: j.advanceAmount ?? 0,
        createdAt: j.createdAt.toISOString(),
        updatedAt: j.updatedAt.toISOString(),
        completedAt: j.completedAt?.toISOString() ?? undefined,
        activities: j.activities ? j.activities.map((a: any) => ({
            ...a,
            createdAt: a.createdAt.toISOString()
        })) : [],
        photos: j.photos ? j.photos.map((p: any) => ({
            ...p,
            createdAt: p.createdAt.toISOString()
        })) : []
    };
}

function mapUser(u: any) {
    const { password: _, ...rest } = u;
    return {
        ...rest,
        active: u.isActive,
        joinedAt: u.createdAt.toISOString().slice(0, 10),
        createdAt: u.createdAt.toISOString(),
    };
}

function mapInventory(i: any) {
    return {
        ...i,
        unitCost: i.unitPrice,
        minStock: i.minQuantity,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
    };
}

// ── Sales helpers ─────────────────────────────────────────────────
async function fetchSalesWithItems() {
    const sales = await prisma.sale.findMany({
        orderBy: { createdAt: 'desc' },
        include: { items: true },
    });

    return sales.map((s: any) => ({
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
        items: s.items.map((i: any) => ({
            id: i.id,
            saleId: i.saleId,
            inventoryItemId: i.inventoryItemId,
            itemName: i.itemName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            subtotal: i.subtotal,
        })),
    }));
}

// ── GET /api/data — role-scoped payload ──────────────────────────
// This endpoint loads all app data — protected with a stricter LENIENT
// limit (100 req/min) per user+IP combo to prevent polling abuse.

export async function GET(request: Request) {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    // ── Rate limiting ─────────────────────────────────────────────
    // /api/data is the heaviest endpoint (loads ALL app data).
    // Use LENIENT tier (100 req/min) — generous enough for normal use
    // but prevents runaway polling or scripted abuse.
    const ip = getClientIP(request);
    const limit = await rateLimiter.check(
        `api:data:${auth.user.id}:${ip}`,
        RATE_LIMITS.LENIENT
    );
    if (limit.isLimited) {
        return NextResponse.json(
            { error: `Too many requests. Try again in ${limit.retryAfter} seconds.` },
            { status: 429, headers: { 'Retry-After': limit.retryAfter.toString() } }
        );
    }

    const { user } = auth;

    try {
        // ── Engineer: only their own data ────────────────────────
        if (user.role === 'engineer') {
            const [myJobs, allPartRequests, myNotifications, allDevices, allCustomers, allInventory] =
                await Promise.all([
                    // Jobs assigned to this engineer
                    prisma.job.findMany({
                        where: { engineerId: user.id },
                        orderBy: { createdAt: 'desc' },
                        include: { activities: true, photos: true },
                    }),
                    // Part requests submitted by this engineer
                    prisma.partRequest.findMany({
                        where: { engineerId: user.id },
                        orderBy: { createdAt: 'desc' },
                    }),
                    // Notifications for this engineer only
                    prisma.notification.findMany({
                        where: { userId: user.id },
                        orderBy: { createdAt: 'desc' },
                    }),
                    // Devices and customers are needed to display job details
                    prisma.device.findMany({ orderBy: { createdAt: 'desc' } }),
                    prisma.customer.findMany({ orderBy: { createdAt: 'desc' } }),
                    // Inventory for autocomplete suggestions (limited data)
                    prisma.inventoryItem.findMany({ orderBy: { name: 'asc' } }),
                ]);

            // Only expose the engineer's own profile — no other users
            const selfUser = await prisma.user.findUnique({ where: { id: user.id } });

            return NextResponse.json({
                // Only the engineer themselves — no other users visible
                users: selfUser ? [mapUser(selfUser)] : [],
                // Customers and devices needed to render job details (read-only context)
                customers: allCustomers.map((c: any) => ({
                    ...c,
                    createdAt: c.createdAt.toISOString(),
                    updatedAt: c.updatedAt.toISOString(),
                })),
                devices: allDevices.map((d: any) => ({
                    ...d,
                    serialNumber: d.serialNo,
                    createdAt: d.createdAt.toISOString(),
                })),
                jobs: myJobs.map(mapJob),
                partRequests: allPartRequests.map((r: any) => ({
                    ...r,
                    createdAt: r.createdAt.toISOString(),
                    updatedAt: r.updatedAt.toISOString(),
                    reviewedAt: r.reviewedAt?.toISOString() ?? undefined,
                })),
                // Expose limited inventory data to engineers for part autocomplete
                inventory: allInventory.map((i: any) => ({
                    id: i.id,
                    name: i.name,
                    category: i.category,
                    quantity: i.quantity,
                })),
                sales: [],
                notifications: myNotifications.map((n: any) => ({
                    ...n,
                    createdAt: n.createdAt.toISOString(),
                })),
            });
        }

        // ── Reception: operational data, limited user list ────────
        if (user.role === 'reception') {
            const [
                engineers,
                customers,
                devices,
                jobs,
                partRequests,
                inventory,
                notifications,
            ] = await Promise.all([
                // Reception only needs the engineers list (to assign/display names)
                // They do NOT see admin accounts or other reception accounts
                prisma.user.findMany({
                    where: { role: 'engineer' },
                    orderBy: { createdAt: 'asc' },
                }),
                prisma.customer.findMany({ orderBy: { createdAt: 'desc' } }),
                prisma.device.findMany({ orderBy: { createdAt: 'desc' } }),
                prisma.job.findMany({ orderBy: { createdAt: 'desc' }, include: { activities: true, photos: true } }),
                prisma.partRequest.findMany({ orderBy: { createdAt: 'desc' } }),
                prisma.inventoryItem.findMany({ orderBy: { name: 'asc' } }),
                // Reception sees all notifications (they may act on part-request decisions)
                prisma.notification.findMany({ orderBy: { createdAt: 'desc' } }),
            ]);

            return NextResponse.json({
                users: engineers.map(mapUser),
                customers: customers.map((c: any) => ({
                    ...c,
                    createdAt: c.createdAt.toISOString(),
                    updatedAt: c.updatedAt.toISOString(),
                })),
                devices: devices.map((d: any) => ({
                    ...d,
                    serialNumber: d.serialNo,
                    createdAt: d.createdAt.toISOString(),
                })),
                jobs: jobs.map(mapJob),
                partRequests: partRequests.map((r: any) => ({
                    ...r,
                    createdAt: r.createdAt.toISOString(),
                    updatedAt: r.updatedAt.toISOString(),
                    reviewedAt: r.reviewedAt?.toISOString() ?? undefined,
                })),
                inventory: inventory.map(mapInventory),
                notifications: notifications.map((n: any) => ({
                    ...n,
                    createdAt: n.createdAt.toISOString(),
                })),
                sales: await fetchSalesWithItems(),
            });
        }

        // ── Admin: full data ──────────────────────────────────────
        const [users, customers, devices, jobs, partRequests, inventory, notifications] =
            await Promise.all([
                prisma.user.findMany({ orderBy: { createdAt: 'asc' } }),
                prisma.customer.findMany({ orderBy: { createdAt: 'desc' } }),
                prisma.device.findMany({ orderBy: { createdAt: 'desc' } }),
                prisma.job.findMany({ orderBy: { createdAt: 'desc' }, include: { activities: true, photos: true } }),
                prisma.partRequest.findMany({ orderBy: { createdAt: 'desc' } }),
                prisma.inventoryItem.findMany({ orderBy: { name: 'asc' } }),
                prisma.notification.findMany({ orderBy: { createdAt: 'desc' } }),
            ]);

        return NextResponse.json({
            users: users.map(mapUser),
            customers: customers.map((c: any) => ({
                ...c,
                createdAt: c.createdAt.toISOString(),
                updatedAt: c.updatedAt.toISOString(),
            })),
            devices: devices.map((d: any) => ({
                ...d,
                serialNumber: d.serialNo,
                createdAt: d.createdAt.toISOString(),
            })),
            jobs: jobs.map(mapJob),
            partRequests: partRequests.map((r: any) => ({
                ...r,
                createdAt: r.createdAt.toISOString(),
                updatedAt: r.updatedAt.toISOString(),
                reviewedAt: r.reviewedAt?.toISOString() ?? undefined,
            })),
            inventory: inventory.map(mapInventory),
            notifications: notifications.map((n: any) => ({
                ...n,
                createdAt: n.createdAt.toISOString(),
            })),
            sales: await fetchSalesWithItems(),
        });

    } catch (error) {
        console.error('[api/data]', error);
        return NextResponse.json({ error: 'Failed to fetch data.' }, { status: 500 });
    }
}
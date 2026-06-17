import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { rateLimiter, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';
import type { Prisma } from '@prisma/client';
import type { JobWithRelations } from '@/types/prisma';

// ── Prisma Include-Aware Return Types ──────────────────────────────

// ── Mappers ───────────────────────────────────────────────────────

function mapJob(j: JobWithRelations) {
    return {
        ...j,
        problemDescription: j.problemDesc,
        assignedEngineerId: j.engineerId,
        estimatedCost: j.estimatedCost ?? 0,
        advanceAmount: j.advanceAmount ?? 0,
        createdAt: j.createdAt.toISOString(),
        updatedAt: j.updatedAt.toISOString(),
        completedAt: j.completedAt?.toISOString() ?? undefined,
        activities: j.activities ? j.activities.map((a) => ({
            ...a,
            createdAt: a.createdAt.toISOString()
        })) : [],
        photos: j.photos ? j.photos.map((p) => ({
            ...p,
            createdAt: p.createdAt.toISOString()
        })) : []
    };
}

function mapUser(u: Prisma.UserGetPayload<{}>) {
    const { password: _, ...rest } = u;
    return {
        ...rest,
        active: u.isActive,
        joinedAt: u.createdAt.toISOString().slice(0, 10),
        createdAt: u.createdAt.toISOString(),
    };
}

function mapInventory(i: Prisma.InventoryItemGetPayload<{}>) {
    return {
        ...i,
        unitCost: i.unitPrice,
        minStock: i.minQuantity,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
    };
}

function mapCustomer(c: Prisma.CustomerGetPayload<{}>) {
    return {
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
    };
}

function mapDevice(d: Prisma.DeviceGetPayload<{}>) {
    return {
        ...d,
        serialNumber: d.serialNo,
        createdAt: d.createdAt.toISOString(),
    };
}

function mapPartRequest(r: Prisma.PartRequestGetPayload<{}>) {
    return {
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        reviewedAt: r.reviewedAt?.toISOString() ?? undefined,
    };
}

function mapNotification(n: Prisma.NotificationGetPayload<{}>) {
    return {
        ...n,
        createdAt: n.createdAt.toISOString(),
    };
}

type SaleWithItems = Prisma.SaleGetPayload<{
    include: { items: true }
}>;

async function fetchSalesWithItems(limit?: number, branchId?: string) {
    const sales = await prisma.sale.findMany({
        where: branchId ? { branchId } : {},
        orderBy: { createdAt: 'desc' },
        ...(limit ? { take: limit } : {}),
        include: { items: true },
    });

    return sales.map((s: SaleWithItems) => ({
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
        items: s.items.map((i) => ({
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
                    // Jobs assigned to this engineer (limit to 50 recent)
                    prisma.job.findMany({
                        where: { engineerId: user.id, branchId: user.branchId },
                        orderBy: { createdAt: 'desc' },
                        take: 50,
                        include: { activities: true, photos: true },
                    }),
                    // Part requests submitted by this engineer (limit to 50 recent)
                    prisma.partRequest.findMany({
                        where: { engineerId: user.id, branchId: user.branchId },
                        orderBy: { createdAt: 'desc' },
                        take: 50,
                    }),
                    // Notifications for this engineer only (limit to 50 recent)
                    prisma.notification.findMany({
                        where: { userId: user.id, branchId: user.branchId },
                        orderBy: { createdAt: 'desc' },
                        take: 50,
                    }),
                    // Devices and customers are needed to display job details (limit to 50 recent)
                    prisma.device.findMany({ where: { branchId: user.branchId }, orderBy: { createdAt: 'desc' }, take: 50 }),
                    prisma.customer.findMany({ where: { branchId: user.branchId }, orderBy: { createdAt: 'desc' }, take: 50 }),
                    // Inventory for autocomplete suggestions (limited data)
                    prisma.inventoryItem.findMany({ where: { branchId: user.branchId }, orderBy: { name: 'asc' }, take: 50 }),
                ]);

            // Only expose the engineer's own profile — no other users
            const selfUser = await prisma.user.findUnique({ where: { id: user.id } });

            return NextResponse.json({
                // Only the engineer themselves — no other users visible
                users: selfUser ? [mapUser(selfUser)] : [],
                // Customers and devices needed to render job details (read-only context)
                customers: allCustomers.map(mapCustomer),
                devices: allDevices.map(mapDevice),
                jobs: myJobs.map(mapJob),
                partRequests: allPartRequests.map(mapPartRequest),
                // Expose limited inventory data to engineers for part autocomplete
                inventory: allInventory.map((i: any) => ({
                    id: i.id,
                    name: i.name,
                    category: i.category,
                    quantity: i.quantity,
                })),
                sales: [],
                notifications: myNotifications.map(mapNotification),
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
                criticalInventory,
                totalCompletedJobs,
                totalPendingJobs,
                totalEngineers,
                activeEngineers,
                pendingPartsCount,
                lowStockCountResult
            ] = await Promise.all([
                // Reception only needs the engineers list (to assign/display names)
                // They do NOT see admin accounts or other reception accounts
                prisma.user.findMany({
                    where: { role: 'engineer', branchId: user.branchId },
                    orderBy: { createdAt: 'asc' },
                    take: 50,
                }),
                prisma.customer.findMany({ where: { branchId: user.branchId }, orderBy: { createdAt: 'desc' }, take: 20 }),
                prisma.device.findMany({ where: { branchId: user.branchId }, orderBy: { createdAt: 'desc' }, take: 20 }),
                prisma.job.findMany({ where: { branchId: user.branchId }, orderBy: { createdAt: 'desc' }, take: 100, include: { activities: true, photos: true } }),
                prisma.partRequest.findMany({ where: { branchId: user.branchId }, orderBy: { createdAt: 'desc' }, take: 50 }),
                prisma.inventoryItem.findMany({ where: { branchId: user.branchId }, orderBy: { name: 'asc' }, take: 50 }),
                // Reception sees all notifications (they may act on part-request decisions)
                prisma.notification.findMany({ where: { branchId: user.branchId }, orderBy: { createdAt: 'desc' }, take: 50 }),
                // Pre-query critical inventory items to ensure dashboard alerts work
                prisma.$queryRaw<Prisma.InventoryItemGetPayload<{}>[]>`SELECT * FROM "InventoryItem" WHERE "branchId" = ${user.branchId} AND "quantity" <= "minQuantity" LIMIT 10`,
                // Compute stats
                prisma.job.count({ where: { status: { in: ['Completed', 'Delivered'] }, branchId: user.branchId } }),
                prisma.job.count({ where: { status: { in: ['New', 'Assigned', 'In Progress'] }, branchId: user.branchId } }),
                prisma.user.count({ where: { role: 'engineer', branchId: user.branchId } }),
                prisma.user.count({ where: { role: 'engineer', isActive: true, branchId: user.branchId } }),
                prisma.partRequest.count({ where: { status: { in: ['Pending', 'AwaitingStock'] }, branchId: user.branchId } }),
                prisma.$queryRaw<Array<{count: bigint}>>`SELECT COUNT(*) as count FROM "InventoryItem" WHERE "branchId" = ${user.branchId} AND "quantity" <= "minQuantity"`,
            ]);

            const mappedCritical = (criticalInventory ?? []).map(mapInventory);
            const mappedNormal = inventory.map(mapInventory);
            const combinedInventory = Array.from(new Map([...mappedCritical, ...mappedNormal].map(i => [i.id, i])).values());
            const lowStockCount = Number(lowStockCountResult?.[0]?.count ?? 0);

            const { getDeploymentRole } = await import('@/lib/branchContext');
            const isHQVal = getDeploymentRole() === 'hq';
            const branches = isHQVal ? await prisma.branch.findMany({ orderBy: { name: 'asc' } }) : [];

            return NextResponse.json({
                users: engineers.map(mapUser),
                customers: customers.map(mapCustomer),
                devices: devices.map(mapDevice),
                jobs: jobs.map(mapJob),
                partRequests: partRequests.map(mapPartRequest),
                inventory: combinedInventory,
                notifications: notifications.map(mapNotification),
                sales: await fetchSalesWithItems(100, user.branchId),
                isHQ: isHQVal,
                branches,
                stats: {
                    totalCompletedJobs,
                    totalPendingJobs,
                    totalEngineers,
                    activeEngineers,
                    pendingPartsCount,
                    lowStockCount,
                    totalRevenue: 0, // Not shared with reception
                }
            });

        }

        // ── Admin: full data ──────────────────────────────────────
        const isSuperAdmin = user.role === 'super_admin';
        const [
            users,
            customers,
            devices,
            jobs,
            partRequests,
            inventory,
            notifications,
            criticalInventory,
            totalCompletedJobs,
            totalPendingJobs,
            totalEngineers,
            activeEngineers,
            pendingPartsCount,
            lowStockCountResult,
            totalRevenueJobs,
            totalRevenueSales
        ] = await Promise.all([
            prisma.user.findMany({
                where: isSuperAdmin ? {} : { branchId: user.branchId },
                orderBy: { createdAt: 'asc' },
                take: 50
            }),
            prisma.customer.findMany({
                where: isSuperAdmin ? {} : { branchId: user.branchId },
                orderBy: { createdAt: 'desc' },
                take: 20
            }),
            prisma.device.findMany({
                where: isSuperAdmin ? {} : { branchId: user.branchId },
                orderBy: { createdAt: 'desc' },
                take: 20
            }),
            prisma.job.findMany({
                where: isSuperAdmin ? {} : { branchId: user.branchId },
                orderBy: { createdAt: 'desc' },
                take: 100,
                include: { activities: true, photos: true }
            }),
            prisma.partRequest.findMany({
                where: isSuperAdmin ? {} : { branchId: user.branchId },
                orderBy: { createdAt: 'desc' },
                take: 50
            }),
            prisma.inventoryItem.findMany({
                where: isSuperAdmin ? {} : { branchId: user.branchId },
                orderBy: { name: 'asc' },
                take: 50
            }),
            prisma.notification.findMany({
                where: isSuperAdmin ? {} : { branchId: user.branchId },
                orderBy: { createdAt: 'desc' },
                take: 50
            }),
            // Pre-query critical inventory items to ensure dashboard alerts work
            isSuperAdmin
                ? prisma.$queryRaw<Prisma.InventoryItemGetPayload<{}>[]>`SELECT * FROM "InventoryItem" WHERE "quantity" <= "minQuantity" LIMIT 10`
                : prisma.$queryRaw<Prisma.InventoryItemGetPayload<{}>[]>`SELECT * FROM "InventoryItem" WHERE "branchId" = ${user.branchId} AND "quantity" <= "minQuantity" LIMIT 10`,
            // Compute stats
            prisma.job.count({
                where: {
                    status: { in: ['Completed', 'Delivered'] },
                    ...(isSuperAdmin ? {} : { branchId: user.branchId })
                }
            }),
            prisma.job.count({
                where: {
                    status: { in: ['New', 'Assigned', 'In Progress'] },
                    ...(isSuperAdmin ? {} : { branchId: user.branchId })
                }
            }),
            prisma.user.count({
                where: {
                    role: 'engineer',
                    ...(isSuperAdmin ? {} : { branchId: user.branchId })
                }
            }),
            prisma.user.count({
                where: {
                    role: 'engineer',
                    isActive: true,
                    ...(isSuperAdmin ? {} : { branchId: user.branchId })
                }
            }),
            prisma.partRequest.count({
                where: {
                    status: { in: ['Pending', 'AwaitingStock'] },
                    ...(isSuperAdmin ? {} : { branchId: user.branchId })
                }
            }),
            isSuperAdmin
                ? prisma.$queryRaw<Array<{count: bigint}>>`SELECT COUNT(*) as count FROM "InventoryItem" WHERE "quantity" <= "minQuantity"`
                : prisma.$queryRaw<Array<{count: bigint}>>`SELECT COUNT(*) as count FROM "InventoryItem" WHERE "branchId" = ${user.branchId} AND "quantity" <= "minQuantity"`,
            isSuperAdmin
                ? prisma.$queryRaw<Array<{sum: number | null}>>`SELECT SUM(COALESCE("actualCost", COALESCE("estimatedCost", 0))) as sum FROM "Job" WHERE "status" IN ('Completed', 'Delivered')`
                : prisma.$queryRaw<Array<{sum: number | null}>>`SELECT SUM(COALESCE("actualCost", COALESCE("estimatedCost", 0))) as sum FROM "Job" WHERE "branchId" = ${user.branchId} AND "status" IN ('Completed', 'Delivered')`,
            isSuperAdmin
                ? prisma.$queryRaw<Array<{sum: number | null}>>`SELECT SUM(COALESCE("totalAmount", 0)) as sum FROM "Sale"`
                : prisma.$queryRaw<Array<{sum: number | null}>>`SELECT SUM(COALESCE("totalAmount", 0)) as sum FROM "Sale" WHERE "branchId" = ${user.branchId}`,
        ]);

        const mappedCritical = (criticalInventory ?? []).map(mapInventory);
        const mappedNormal = inventory.map(mapInventory);
        const combinedInventory = Array.from(new Map([...mappedCritical, ...mappedNormal].map(i => [i.id, i])).values());
        
        const lowStockCount = Number(lowStockCountResult?.[0]?.count ?? 0);
        const totalRevenue = Number(totalRevenueJobs?.[0]?.sum ?? 0) + Number(totalRevenueSales?.[0]?.sum ?? 0);

        const { getDeploymentRole } = await import('@/lib/branchContext');
        const isHQVal = getDeploymentRole() === 'hq';
        const branches = isHQVal ? await prisma.branch.findMany({ orderBy: { name: 'asc' } }) : [];

        return NextResponse.json({
            users: users.map(mapUser),
            customers: customers.map(mapCustomer),
            devices: devices.map(mapDevice),
            jobs: jobs.map(mapJob),
            partRequests: partRequests.map(mapPartRequest),
            inventory: combinedInventory,
            notifications: notifications.map(mapNotification),
            sales: await fetchSalesWithItems(100, isSuperAdmin ? undefined : user.branchId),
            isHQ: isHQVal,
            branches,
            stats: {
                totalCompletedJobs,
                totalPendingJobs,
                totalEngineers,
                activeEngineers,
                pendingPartsCount,
                lowStockCount,
                totalRevenue,
            }
        });

    } catch (error) {
        console.error('[api/data]', error);
        return NextResponse.json({ error: 'Failed to fetch data.' }, { status: 500 });
    }
}
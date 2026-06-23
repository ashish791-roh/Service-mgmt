import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { rateLimiter, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';
import type { Prisma } from '@prisma/client';
import type { JobWithRelations } from '@/types/prisma';

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

export async function GET(request: Request) {
    const startTime = performance.now();
    const auth = await requireSession();
    if ('error' in auth) return auth.error;

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

    const { user: sessionUser } = auth;
    const { searchParams } = new URL(request.url);
    const phase = searchParams.get('phase') || '1';

    try {
        const dbUser = await prisma.user.findUnique({ where: { id: sessionUser.id } });
        if (!dbUser || !dbUser.isActive) {
            return NextResponse.json({ error: 'User not found or disabled.' }, { status: 403 });
        }

        const user = {
            id: dbUser.id,
            role: dbUser.role,
            branchId: dbUser.branchId || 'default',
        };

        let responsePayload: any = {};

        if (phase === '1') {
            if (user.role === 'engineer') {
                const [myJobs, myNotifications, allDevices, allCustomers] = await Promise.all([
                    prisma.job.findMany({
                        where: { engineerId: user.id, branchId: user.branchId },
                        orderBy: { createdAt: 'desc' },
                        take: 50,
                        include: { activities: true, photos: true },
                    }),
                    prisma.notification.findMany({
                        where: { userId: user.id, branchId: user.branchId },
                        orderBy: { createdAt: 'desc' },
                        take: 50,
                    }),
                    prisma.device.findMany({ where: { branchId: user.branchId }, orderBy: { createdAt: 'desc' }, take: 50 }),
                    prisma.customer.findMany({ where: { branchId: user.branchId }, orderBy: { createdAt: 'desc' }, take: 50 }),
                ]);

                responsePayload = {
                    jobs: myJobs.map(mapJob),
                    notifications: myNotifications.map(mapNotification),
                    customers: allCustomers.map(mapCustomer),
                    devices: allDevices.map(mapDevice),
                    isHQ: false,
                    branches: [],
                    stats: null,
                };
            } else if (user.role === 'reception') {
                const { getDeploymentRole } = await import('@/lib/branchContext');
                const isHQVal = getDeploymentRole() === 'hq';

                const [
                    customers,
                    devices,
                    jobs,
                    notifications,
                    totalCompletedJobs,
                    totalPendingJobs,
                    totalEngineers,
                    activeEngineers,
                    pendingPartsCount,
                    lowStockCountResult,
                    branches,
                ] = await Promise.all([
                    prisma.customer.findMany({ where: { branchId: user.branchId }, orderBy: { createdAt: 'desc' }, take: 20 }),
                    prisma.device.findMany({ where: { branchId: user.branchId }, orderBy: { createdAt: 'desc' }, take: 20 }),
                    prisma.job.findMany({ where: { branchId: user.branchId }, orderBy: { createdAt: 'desc' }, take: 100, include: { activities: true, photos: true } }),
                    prisma.notification.findMany({ where: { branchId: user.branchId }, orderBy: { createdAt: 'desc' }, take: 50 }),
                    prisma.job.count({ where: { status: { in: ['Completed', 'Delivered'] }, branchId: user.branchId } }),
                    prisma.job.count({ where: { status: { in: ['New', 'Assigned', 'In Progress'] }, branchId: user.branchId } }),
                    prisma.user.count({ where: { role: 'engineer', branchId: user.branchId } }),
                    prisma.user.count({ where: { role: 'engineer', isActive: true, branchId: user.branchId } }),
                    prisma.partRequest.count({ where: { status: { in: ['Pending', 'AwaitingStock'] }, branchId: user.branchId } }),
                    prisma.$queryRaw<Array<{count: bigint}>>`SELECT COUNT(*) as count FROM "InventoryItem" WHERE "branchId" = ${user.branchId} AND "quantity" <= "minQuantity"`,
                    isHQVal ? prisma.branch.findMany({ orderBy: { name: 'asc' } }) : Promise.resolve([]),
                ]);

                const lowStockCount = Number(lowStockCountResult?.[0]?.count ?? 0);

                responsePayload = {
                    customers: customers.map(mapCustomer),
                    devices: devices.map(mapDevice),
                    jobs: jobs.map(mapJob),
                    notifications: notifications.map(mapNotification),
                    isHQ: isHQVal,
                    branches,
                    stats: {
                        totalCompletedJobs,
                        totalPendingJobs,
                        totalEngineers,
                        activeEngineers,
                        pendingPartsCount,
                        lowStockCount,
                        totalRevenue: 0,
                    },
                };
            } else {
                // Admin / SuperAdmin
                const isSuperAdmin = user.role === 'super_admin';
                const { getDeploymentRole } = await import('@/lib/branchContext');
                const isHQVal = getDeploymentRole() === 'hq';

                const [
                    customers,
                    devices,
                    jobs,
                    notifications,
                    totalCompletedJobs,
                    totalPendingJobs,
                    totalEngineers,
                    activeEngineers,
                    pendingPartsCount,
                    lowStockCountResult,
                    totalRevenueJobs,
                    totalRevenueSales,
                    branches,
                ] = await Promise.all([
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
                    prisma.notification.findMany({
                        where: isSuperAdmin ? {} : { branchId: user.branchId },
                        orderBy: { createdAt: 'desc' },
                        take: 50
                    }),
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
                    isHQVal ? prisma.branch.findMany({ orderBy: { name: 'asc' } }) : Promise.resolve([]),
                ]);

                const lowStockCount = Number(lowStockCountResult?.[0]?.count ?? 0);
                const totalRevenue = Number(totalRevenueJobs?.[0]?.sum ?? 0) + Number(totalRevenueSales?.[0]?.sum ?? 0);

                responsePayload = {
                    customers: customers.map(mapCustomer),
                    devices: devices.map(mapDevice),
                    jobs: jobs.map(mapJob),
                    notifications: notifications.map(mapNotification),
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
                    },
                };
            }
        } else if (phase === '2') {
            if (user.role === 'engineer') {
                const [selfUser, allPartRequests, allInventory] = await Promise.all([
                    prisma.user.findUnique({ where: { id: user.id } }),
                    prisma.partRequest.findMany({
                        where: { engineerId: user.id, branchId: user.branchId },
                        orderBy: { createdAt: 'desc' },
                        take: 50,
                    }),
                    prisma.inventoryItem.findMany({ where: { branchId: user.branchId }, orderBy: { name: 'asc' }, take: 50 }),
                ]);

                responsePayload = {
                    users: selfUser ? [mapUser(selfUser)] : [],
                    partRequests: allPartRequests.map(mapPartRequest),
                    inventory: allInventory.map((i: any) => ({
                        id: i.id,
                        name: i.name,
                        category: i.category,
                        quantity: i.quantity,
                    })),
                    sales: [],
                };
            } else if (user.role === 'reception') {
                const [engineers, partRequests, inventory, sales] = await Promise.all([
                    prisma.user.findMany({
                        where: { role: 'engineer', branchId: user.branchId },
                        orderBy: { createdAt: 'asc' },
                        take: 50,
                    }),
                    prisma.partRequest.findMany({ where: { branchId: user.branchId }, orderBy: { createdAt: 'desc' }, take: 50 }),
                    prisma.inventoryItem.findMany({ where: { branchId: user.branchId }, orderBy: { name: 'asc' }, take: 50 }),
                    fetchSalesWithItems(100, user.branchId),
                ]);

                responsePayload = {
                    users: engineers.map(mapUser),
                    partRequests: partRequests.map(mapPartRequest),
                    inventory: inventory.map(mapInventory),
                    sales,
                };
            } else {
                // Admin / SuperAdmin
                const isSuperAdmin = user.role === 'super_admin';
                const [users, partRequests, inventory, sales] = await Promise.all([
                    prisma.user.findMany({
                        where: isSuperAdmin ? {} : { branchId: user.branchId },
                        orderBy: { createdAt: 'asc' },
                        take: 50
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
                    fetchSalesWithItems(100, isSuperAdmin ? undefined : user.branchId),
                ]);

                responsePayload = {
                    users: users.map(mapUser),
                    partRequests: partRequests.map(mapPartRequest),
                    inventory: inventory.map(mapInventory),
                    sales,
                };
            }
        }

        const duration = (performance.now() - startTime).toFixed(2);
        const headers = {
            'Cache-Control': 'private, no-store',
            'Vary': 'Accept-Encoding',
            'X-Response-Phase': phase,
            'Server-Timing': `db;dur=${duration}`,
        };

        return NextResponse.json(responsePayload, { headers });

    } catch (error) {
        console.error('[api/data]', error);
        return NextResponse.json({ error: 'Failed to fetch data.' }, { status: 500 });
    }
}
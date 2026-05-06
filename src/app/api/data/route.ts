import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';

// ── Mappers ───────────────────────────────────────────────────────

function mapJob(j: any) {
    return {
        ...j,
        problemDescription: j.problemDesc,
        assignedEngineerId: j.engineerId,
        estimatedCost: j.estimatedCost ?? 0,
        createdAt: j.createdAt.toISOString(),
        updatedAt: j.updatedAt.toISOString(),
        completedAt: j.completedAt?.toISOString() ?? undefined,
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

// ── GET /api/data — role-scoped payload ──────────────────────────

export async function GET() {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    const { user } = auth;

    try {
        // ── Engineer: only their own data ────────────────────────
        if (user.role === 'engineer') {
            const [myJobs, allPartRequests, myNotifications, allDevices, allCustomers] =
                await Promise.all([
                    // Jobs assigned to this engineer
                    prisma.job.findMany({
                        where: { engineerId: user.id },
                        orderBy: { createdAt: 'desc' },
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
                ]);

            // Only expose the engineer's own profile — no other users
            const selfUser = await prisma.user.findUnique({ where: { id: user.id } });

            return NextResponse.json({
                // Only the engineer themselves — no other users visible
                users: selfUser ? [mapUser(selfUser)] : [],
                // Customers and devices needed to render job details (read-only context)
                customers: allCustomers.map(c => ({
                    ...c,
                    createdAt: c.createdAt.toISOString(),
                    updatedAt: c.updatedAt.toISOString(),
                })),
                devices: allDevices.map(d => ({
                    ...d,
                    serialNumber: d.serialNo,
                    createdAt: d.createdAt.toISOString(),
                })),
                jobs: myJobs.map(mapJob),
                partRequests: allPartRequests.map(r => ({
                    ...r,
                    createdAt: r.createdAt.toISOString(),
                    updatedAt: r.updatedAt.toISOString(),
                    reviewedAt: r.reviewedAt?.toISOString() ?? undefined,
                })),
                // Engineers don't see inventory
                inventory: [],
                notifications: myNotifications.map(n => ({
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
                prisma.job.findMany({ orderBy: { createdAt: 'desc' } }),
                prisma.partRequest.findMany({ orderBy: { createdAt: 'desc' } }),
                prisma.inventoryItem.findMany({ orderBy: { name: 'asc' } }),
                // Reception sees all notifications (they may act on part-request decisions)
                prisma.notification.findMany({ orderBy: { createdAt: 'desc' } }),
            ]);

            return NextResponse.json({
                users: engineers.map(mapUser),
                customers: customers.map(c => ({
                    ...c,
                    createdAt: c.createdAt.toISOString(),
                    updatedAt: c.updatedAt.toISOString(),
                })),
                devices: devices.map(d => ({
                    ...d,
                    serialNumber: d.serialNo,
                    createdAt: d.createdAt.toISOString(),
                })),
                jobs: jobs.map(mapJob),
                partRequests: partRequests.map(r => ({
                    ...r,
                    createdAt: r.createdAt.toISOString(),
                    updatedAt: r.updatedAt.toISOString(),
                    reviewedAt: r.reviewedAt?.toISOString() ?? undefined,
                })),
                inventory: inventory.map(mapInventory),
                notifications: notifications.map(n => ({
                    ...n,
                    createdAt: n.createdAt.toISOString(),
                })),
            });
        }

        // ── Admin: full data ──────────────────────────────────────
        const [users, customers, devices, jobs, partRequests, inventory, notifications] =
            await Promise.all([
                prisma.user.findMany({ orderBy: { createdAt: 'asc' } }),
                prisma.customer.findMany({ orderBy: { createdAt: 'desc' } }),
                prisma.device.findMany({ orderBy: { createdAt: 'desc' } }),
                prisma.job.findMany({ orderBy: { createdAt: 'desc' } }),
                prisma.partRequest.findMany({ orderBy: { createdAt: 'desc' } }),
                prisma.inventoryItem.findMany({ orderBy: { name: 'asc' } }),
                prisma.notification.findMany({ orderBy: { createdAt: 'desc' } }),
            ]);

        return NextResponse.json({
            users: users.map(mapUser),
            customers: customers.map(c => ({
                ...c,
                createdAt: c.createdAt.toISOString(),
                updatedAt: c.updatedAt.toISOString(),
            })),
            devices: devices.map(d => ({
                ...d,
                serialNumber: d.serialNo,
                createdAt: d.createdAt.toISOString(),
            })),
            jobs: jobs.map(mapJob),
            partRequests: partRequests.map(r => ({
                ...r,
                createdAt: r.createdAt.toISOString(),
                updatedAt: r.updatedAt.toISOString(),
                reviewedAt: r.reviewedAt?.toISOString() ?? undefined,
            })),
            inventory: inventory.map(mapInventory),
            notifications: notifications.map(n => ({
                ...n,
                createdAt: n.createdAt.toISOString(),
            })),
        });

    } catch (error) {
        console.error('[api/data]', error);
        return NextResponse.json({ error: 'Failed to fetch data.' }, { status: 500 });
    }
}

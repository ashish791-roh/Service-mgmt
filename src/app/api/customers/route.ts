import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { writeAuditLog } from '@/lib/auditLog';
import { rateLimiter, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';
import { validateBody, CustomerCreateSchema, CustomerUpdateSchema } from '@/lib/validation';
import type { Prisma } from '@prisma/client';
import type { CustomerWithRelations } from '@/types/prisma';
import { addToTallyQueue } from '@/lib/tallyQueue';
import { captureChange } from '@/lib/branchSync';
import { withLocalBranchId } from '@/lib/branchContext';

// ── Rate-limit helper shared by all handlers ────────────────────────────────
async function checkRateLimit(request: Request, userId: string) {
    const ip = getClientIP(request);
    const result = await rateLimiter.check(
        `api:customers:${userId}:${ip}`,
        RATE_LIMITS.MODERATE
    );
    return result;
}

// GET /api/customers — admin, reception, engineer
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

        const where: Prisma.CustomerWhereInput = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
            ];
        }

        const [customers, total] = await Promise.all([
            prisma.customer.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: (page - 1) * limit,
                include: {
                    jobs: true,
                    devices: true,
                },
            }),
            prisma.customer.count({ where }),
        ]);

        const customerIds = customers.map((c: any) => c.id);
        const queueItems = prisma.tallyQueueItem
            ? await prisma.tallyQueueItem.findMany({
                where: {
                    entityType: 'customer',
                    entityId: { in: customerIds },
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
            customers: customers.map((c: CustomerWithRelations) => ({
                ...c,
                tallyStatus: statusMap.get(c.id) || null,
                createdAt: c.createdAt.toISOString(),
                updatedAt: c.updatedAt.toISOString(),
                jobs: (c.jobs || []).map((j) => ({
                    ...j,
                    problemDescription: j.problemDesc,
                    assignedEngineerId: j.engineerId,
                    estimatedCost: j.estimatedCost ?? 0,
                    advanceAmount: j.advanceAmount ?? 0,
                    createdAt: j.createdAt.toISOString(),
                    updatedAt: j.updatedAt.toISOString(),
                    completedAt: j.completedAt?.toISOString() ?? undefined,
                })),
                devices: (c.devices || []).map((d) => ({
                    ...d,
                    serialNumber: d.serialNo,
                    createdAt: d.createdAt.toISOString(),
                })),
            })),
            total,
            page,
            limit,
        }, {
            headers: {
                'Cache-Control': 'private, max-age=15, stale-while-revalidate=30'
            }
        });
    } catch (error) {
        console.error('[api/customers GET]', error);
        return NextResponse.json({ error: 'Failed to fetch customers.' }, { status: 500 });
    }
}

// PUT /api/customers?id=xxx — admin or reception
export async function PUT(request: Request) {
    const auth = await requireSession(request, ['admin', 'reception']);
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
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

        const validation = await validateBody(request, CustomerUpdateSchema);
        if (!validation.success) return validation.errorResponse;
        const body = validation.data;

        const updateData: Prisma.CustomerUpdateInput = {};
        if (body.name !== undefined) updateData.name = body.name;
        if (body.phone !== undefined) updateData.phone = body.phone;
        if (body.address !== undefined) updateData.address = body.address || null;
        if (body.email !== undefined) updateData.email = body.email || null;

        const updated = await prisma.customer.update({
            where: { id },
            data: updateData,
        });

        // ── Outbox Sync ──────────────────────────────────────────────
        captureChange({
            entityType: 'Customer',
            entityId: updated.id,
            action: 'update',
            payload: updated,
        }).catch(err => console.error('[SyncOutbox] Customer update error:', err));

        // ── Audit log — customer updated ────────────────────────────
        {
            const actor = { id: auth.user.id, name: auth.user.name, role: auth.user.role };
            type CustomerField = keyof typeof body;
            const trackedFields: CustomerField[] = ['name', 'phone', 'address', 'email'];
            for (const f of trackedFields) {
                if (body[f] !== undefined) {
                    writeAuditLog({
                        actor, action: 'update', entity: 'customer', entityId: id, field: f,
                        oldValue: updated[f],
                        newValue: body[f],
                    }).catch(() => { });
                }
            }
        }

        return NextResponse.json({
            ...updated,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
        });
    } catch (error) {
        console.error('[api/customers PUT]', error);
        if (error && typeof error === 'object' && 'code' in error) {
            const err = error as { code: string };
            if (err.code === 'P2025') {
                return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
            }
        }
        return NextResponse.json({ error: 'Failed to update customer.' }, { status: 500 });
    }
}

// DELETE /api/customers?id=xxx — admin or reception
export async function DELETE(request: Request) {
    const auth = await requireSession(request, ['admin', 'reception']);
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
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Customer id is required.' }, { status: 400 });

        // Fetch job info for permission check only (with index on customerId, this is fast)
        const customerJobs = await prisma.job.findMany({
            where: { customerId: id },
            select: { id: true, status: true },
        });

        // Reception staff cannot delete a customer who still has active jobs.
        // Admin can delete at any time regardless of job status.
        if (auth.user.role !== 'admin') {
            const activeJobs = customerJobs.filter(
                (j: any) => !['Completed', 'Delivered'].includes(j.status as string)
            );
            if (activeJobs.length > 0) {
                return NextResponse.json(
                    { error: `Cannot delete customer with ${activeJobs.length} active job(s). Complete or deliver all jobs first.` },
                    { status: 409 }
                );
            }
        }

        // Delete customer (cascade deletes all related records via onDelete: Cascade)
        await prisma.customer.delete({ where: { id } });

        // ── Outbox Sync ──────────────────────────────────────────────
        captureChange({
            entityType: 'Customer',
            entityId: id,
            action: 'delete',
            payload: {},
        }).catch(err => console.error('[SyncOutbox] Customer delete error:', err));

        // ── Audit log — customer deleted (non-blocking) ───────────────────────────
        writeAuditLog({
            actor: { id: auth.user.id, name: auth.user.name, role: auth.user.role },
            action: 'delete', entity: 'customer', entityId: id,
        }).catch(() => { }); // Ignore audit log failures

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[api/customers DELETE]', error);
        if (error && typeof error === 'object' && 'code' in error) {
            const err = error as { code: string };
            if (err.code === 'P2025') {
                return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
            }
        }
        return NextResponse.json({ error: 'Failed to delete customer.' }, { status: 500 });
    }
}

// POST /api/customers — admin or reception
export async function POST(request: Request) {
    const auth = await requireSession(request, ['admin', 'reception']);
    if ('error' in auth) return auth.error;

    const limitCheck = await checkRateLimit(request, auth.user.id);
    if (limitCheck.isLimited) {
        return NextResponse.json(
            { error: `Too many requests. Try again in ${limitCheck.retryAfter} seconds.` },
            { status: 429, headers: { 'Retry-After': limitCheck.retryAfter.toString() } }
        );
    }

    try {
        const validation = await validateBody(request, CustomerCreateSchema);
        if (!validation.success) return validation.errorResponse;
        const body = validation.data;

        // ── Duplicate phone check ────────────────────────────────────
        const existing = await prisma.customer.findFirst({
            where: { phone: body.phone },
            select: { id: true, name: true },
        });
        if (existing) {
            return NextResponse.json(
                { error: `A customer with this phone number already exists (${existing.name}).` },
                { status: 409 }
            );
        }

        const customer = await prisma.customer.create({
            data: withLocalBranchId({
                name: body.name,
                phone: body.phone,
                address: body.address || null,
                email: body.email || null,
            }),
        });

        // ── Outbox Sync ──────────────────────────────────────────────
        captureChange({
            entityType: 'Customer',
            entityId: customer.id,
            action: 'create',
            payload: customer,
        }).catch(err => console.error('[SyncOutbox] Customer create error:', err));

        // Queue Tally Ledger Sync
        await addToTallyQueue({
            entityType: 'customer',
            entityId: customer.id,
            actionType: 'sync_ledger',
        }).catch(err => console.error('[Tally Auto-Ledger] Error:', err));

        // ── Audit log — customer created ────────────────────────────
        writeAuditLog({
            actor: { id: auth.user.id, name: auth.user.name, role: auth.user.role },
            action: 'create', entity: 'customer', entityId: customer.id,
            meta: { name: customer.name, phone: customer.phone },
        }).catch(() => { });

        return NextResponse.json({
            ...customer,
            createdAt: customer.createdAt.toISOString(),
            updatedAt: customer.updatedAt.toISOString(),
        }, { status: 201 });
    } catch (error) {
        console.error('[api/customers POST]', error);
        return NextResponse.json({ error: 'Failed to create customer.' }, { status: 500 });
    }
}
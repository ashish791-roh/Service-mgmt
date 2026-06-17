import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { notifyCustomerStatusChange } from '@/lib/customerNotifications';
import { writeAuditLog } from '@/lib/auditLog';
import { rateLimiter, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';
import { validateBody, JobCreateSchema } from '@/lib/validation';
import type { Prisma } from '@prisma/client';
import { captureChange } from '@/lib/branchSync';
import { withLocalBranchId } from '@/lib/branchContext';

// GET /api/jobs — admin, reception, engineer
export async function GET(request: Request) {
    const auth = await requireSession(request, ['admin', 'reception', 'engineer']);
    if ('error' in auth) return auth.error;

    // Rate limiting
    const ip = getClientIP(request);
    const limitCheck = await rateLimiter.check(
        `api:jobs:get:${auth.user.id}:${ip}`,
        RATE_LIMITS.MODERATE
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
        const status = searchParams.get('status') || '';
        const search = searchParams.get('search')?.trim() || '';

        const where: Prisma.JobWhereInput = {};
        
        // Role restrictions
        if (auth.user.role === 'engineer') {
            where.engineerId = auth.user.id;
        } else {
            const engineerId = searchParams.get('engineerId');
            if (engineerId) where.engineerId = engineerId;
        }

        if (status) {
            where.status = status;
        }

        if (search) {
            where.OR = [
                { problemDesc: { contains: search, mode: 'insensitive' } },
                { customer: { name: { contains: search, mode: 'insensitive' } } },
                { device: { model: { contains: search, mode: 'insensitive' } } },
                { device: { brand: { contains: search, mode: 'insensitive' } } },
            ];
        }

        const [jobs, total] = await Promise.all([
            prisma.job.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: (page - 1) * limit,
                include: { customer: true, device: true },
            }),
            prisma.job.count({ where }),
        ]);

        const jobIds = jobs.map((j: any) => j.id);
        const queueItems = prisma.tallyQueueItem
            ? await prisma.tallyQueueItem.findMany({
                where: {
                    entityType: 'job',
                    entityId: { in: jobIds },
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
            jobs: jobs.map((job: any) => ({
                ...job,
                tallyStatus: statusMap.get(job.id) || null,
                problemDescription: job.problemDesc,
                assignedEngineerId: job.engineerId,
                estimatedCost: job.estimatedCost ?? 0,
                advanceAmount: job.advanceAmount ?? 0,
                createdAt: job.createdAt.toISOString(),
                updatedAt: job.updatedAt.toISOString(),
                completedAt: job.completedAt?.toISOString() ?? undefined,
                activities: job.activities ? job.activities.map((a: any) => ({
                    ...a,
                    createdAt: a.createdAt.toISOString(),
                })) : [],
                photos: job.photos ? job.photos.map((p: any) => ({
                    ...p,
                    createdAt: p.createdAt.toISOString(),
                })) : [],
            })),
            total,
            page,
            limit,
        });
    } catch (error) {
        console.error('[api/jobs GET]', error);
        return NextResponse.json({ error: 'Failed to fetch jobs.' }, { status: 500 });
    }
}

// POST /api/jobs — admin or reception
export async function POST(request: Request) {
    const auth = await requireSession(request, ['admin', 'reception']);
    if ('error' in auth) return auth.error;

    // ── Rate limiting ─────────────────────────────────────────────
    const ip = getClientIP(request);
    const limit = await rateLimiter.check(
        `api:jobs:${auth.user.id}:${ip}`,
        RATE_LIMITS.MODERATE
    );
    if (limit.isLimited) {
        return NextResponse.json(
            { error: `Too many requests. Try again in ${limit.retryAfter} seconds.` },
            { status: 429, headers: { 'Retry-After': limit.retryAfter.toString() } }
        );
    }

    try {
        const validation = await validateBody(request, JobCreateSchema);
        if (!validation.success) return validation.errorResponse;
        const body = validation.data;

        const jobStatus = body.assignedEngineerId ? 'Assigned' : 'New';

        // ── Auto-generate invoice number ──
        const year = new Date().getFullYear();
        const jobCount = await prisma.job.count({
            where: {
                createdAt: {
                    gte: new Date(`${year}-01-01T00:00:00.000Z`),
                    lt: new Date(`${year + 1}-01-01T00:00:00.000Z`)
                }
            }
        });
        const invoiceNumber = `INV-${year}-${String(jobCount + 1).padStart(4, '0')}`;

        const job = await prisma.job.create({
            data: withLocalBranchId({
                invoiceNumber,
                customerId: body.customerId,
                deviceId: body.deviceId,
                engineerId: body.assignedEngineerId || null,
                problemDesc: body.problemDescription,
                status: jobStatus,
                estimatedCost: body.estimatedCost,
                advanceAmount: body.advanceAmount,
                linkedJobId: body.linkedJobId || null,
                activities: {
                    create: withLocalBranchId({
                        userId: auth.user.id,
                        action: 'Created Job',
                        details: `Job created with status ${jobStatus} and Invoice Number ${invoiceNumber}`
                    })
                }
            }),
            include: { activities: true }
        });

        // ── Outbox Sync ──────────────────────────────────────────────
        captureChange({
            entityType: 'Job',
            entityId: job.id,
            action: 'create',
            payload: job,
        }).catch(err => console.error('[SyncOutbox] Job create error:', err));

        if (job.activities) {
            for (const act of job.activities) {
                captureChange({
                    entityType: 'JobActivity',
                    entityId: act.id,
                    action: 'create',
                    payload: act,
                }).catch(err => console.error('[SyncOutbox] JobActivity create error:', err));
            }
        }

        // ── Audit log — job created ─────────────────────────────────
        writeAuditLog({
            actor: { id: auth.user.id, name: auth.user.name, role: auth.user.role },
            action: 'create',
            entity: 'job',
            entityId: job.id,
            meta: {
                status: job.status,
                customerId: job.customerId,
                deviceId: job.deviceId,
                engineerId: job.engineerId,
                estimatedCost: job.estimatedCost,
                invoiceNumber: job.invoiceNumber,
            },
        }).catch(() => {});

        // ── Internal engineer notification (unchanged) ────────────
        if (job.engineerId) {
            const notif = await prisma.notification.create({
                data: withLocalBranchId({
                    userId: job.engineerId,
                    message: `New job assigned: ${job.problemDesc.substring(0, 60)}`,
                    jobId: job.id,
                }),
            });
            if (notif) {
                captureChange({
                    entityType: 'Notification',
                    entityId: notif.id,
                    action: 'create',
                    payload: notif,
                }).catch(err => console.error('[SyncOutbox] Notification create error:', err));
            }
        }

        // ── Customer notification on job creation ─────────────────
        if (jobStatus === 'Assigned' || (jobStatus === 'New' && job.engineerId)) {
            const notifyStatus = 'Assigned';

            const [customer, device] = await Promise.all([
                prisma.customer.findUnique({ where: { id: job.customerId } }),
                prisma.device.findUnique({ where: { id: job.deviceId } }),
            ]);

            if (customer) {
                const deviceInfo = device
                    ? `${device.brand} ${device.type} (${device.model})`
                    : undefined;

                notifyCustomerStatusChange({
                    customerName: customer.name,
                    phone: customer.phone,
                    email: customer.email ?? null,
                    jobId: job.id,
                    newStatus: notifyStatus,
                    deviceInfo,
                }).catch((err) =>
                    console.error('[api/jobs POST] Notification error:', err)
                );
            }
        }

        return NextResponse.json({
            ...job,
            problemDescription: job.problemDesc,
            assignedEngineerId: job.engineerId,
            estimatedCost: job.estimatedCost ?? 0,
            advanceAmount: job.advanceAmount ?? 0,
            createdAt: job.createdAt.toISOString(),
            updatedAt: job.updatedAt.toISOString(),
            activities: job.activities.map((a: any) => ({
                ...a,
                createdAt: a.createdAt.toISOString()
            }))
        }, { status: 201 });
    } catch (error) {
        console.error('[api/jobs POST]', error);
        return NextResponse.json({ error: 'Failed to create job.' }, { status: 500 });
    }
}
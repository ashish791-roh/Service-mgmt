import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import {
    notifyCustomerStatusChange,
    sendWarrantySms,
    type NotifiableStatus,
} from '@/lib/customerNotifications';
import { fireWebhooks } from '@/lib/webhooks';
import { writeAuditLog, auditDiff } from '@/lib/auditLog';
import { validateBody, JobUpdateSchema, JobPatchSchema } from '@/lib/validation';
import type { Prisma, Job } from '@prisma/client';
import { addToTallyQueue } from '@/lib/tallyQueue';
import { captureChange } from '@/lib/branchSync';
import { withLocalBranchId } from '@/lib/branchContext';


// ── Server-side warranty duration helper ──────────────────────────────────────
// Mirrors the client-side warrantyConfig.ts defaults.
// Override via WARRANTY_DURATIONS env var (JSON array of {deviceType, days}).
const DEFAULT_WARRANTY = [
    { deviceType: 'Phone',   days: 30  },
    { deviceType: 'Laptop',  days: 60  },
    { deviceType: 'Tablet',  days: 45  },
    { deviceType: 'Desktop', days: 90  },
    { deviceType: 'Other',   days: 30  },
];

function getWarrantyDaysServer(deviceType: string | null | undefined): number {
    let entries = DEFAULT_WARRANTY;
    try {
        const raw = process.env.WARRANTY_DURATIONS;
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) entries = parsed;
        }
    } catch { /* ignore */ }
    if (!deviceType) return 0;
    const key = deviceType.trim().toLowerCase();
    const match =
        entries.find(e => e.deviceType.toLowerCase() === key) ??
        entries.find(e => e.deviceType.toLowerCase() === 'other');
    return match?.days ?? 0;
}

// Statuses that trigger a customer-facing notification
const CUSTOMER_NOTIFY_STATUSES = new Set<NotifiableStatus>([
    'Assigned',
    'In Progress',
    'Completed',
    'Delivered',
]);

// ── Helper: fetch customer + device and send notification ─────────
async function sendCustomerNotification(
    job: Job,
    newStatus: NotifiableStatus
): Promise<void> {
    try {
        const [customer, device] = await Promise.all([
            prisma.customer.findUnique({ where: { id: job.customerId } }),
            prisma.device.findUnique({ where: { id: job.deviceId } }),
        ]);

        if (!customer) {
            console.warn(`[notification] Customer not found for job ${job.id}`);
            return;
        }

        const deviceInfo = device
            ? `${device.brand} ${device.type} (${device.model})`
            : undefined;

        console.log(`[notification] Sending "${newStatus}" notification to ${customer.phone} for job ${job.id}`);

        await notifyCustomerStatusChange({
            customerName: customer.name,
            phone: customer.phone,
            email: customer.email ?? null,
            jobId: job.id,
            newStatus,
            deviceInfo,
        });

        console.log(`[notification] Done for job ${job.id}`);
    } catch (err) {
        console.error(`[notification] Failed for job ${job.id}:`, err);
    }
}

// ── GET /api/jobs/:id — authenticated users (admin, reception, engineer) ─────────
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireSession(request, ['admin', 'reception', 'engineer']);
    if ('error' in auth) return auth.error;

    try {
        const { id: jobId } = await params;
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                customer: true,
                device: true,
                activities: {
                    orderBy: { createdAt: 'desc' },
                },
                photos: true,
            },
        });

        if (!job) {
            return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
        }

        // Return a mapped job object matching the structure in other endpoints
        return NextResponse.json({
            ...job,
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
        });
    } catch (error) {
        console.error('[api/jobs/[id] GET]', error);
        return NextResponse.json({ error: 'Failed to fetch job details.' }, { status: 500 });
    }
}

// ── PUT /api/jobs/:id — admin or reception only ───────────────────
// Full update: can reassign engineer, change cost, update status, etc.
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireSession(request, ['admin', 'reception']);
    if ('error' in auth) return auth.error;

    try {
        const { id: jobId } = await params;
        const validation = await validateBody(request, JobUpdateSchema);
        if (!validation.success) return validation.errorResponse;
        const body = validation.data;

        // Fetch the current job so we can detect a status change
        const existingJob = await prisma.job.findUnique({ where: { id: jobId } });
        if (!existingJob) {
            return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
        }

        // ── Bug 8: Block status updates on unassigned jobs ────────
        // A status change to anything beyond 'New' requires an engineer to be
        // assigned. The incoming body may simultaneously assign an engineer and
        // change the status (e.g. AssignJobsPage does both at once), so we
        // resolve the effective engineerId after merging the incoming payload.
        const effectiveEngineerId =
            body.assignedEngineerId !== undefined
                ? body.assignedEngineerId   // body is assigning (or un-assigning) now
                : existingJob.engineerId;   // keep the existing value

        const STATUSES_REQUIRING_ASSIGNMENT = ['In Progress', 'Completed', 'Delivered'];
        if (
            body.status !== undefined &&
            body.status !== existingJob.status &&
            STATUSES_REQUIRING_ASSIGNMENT.includes(body.status) &&
            !effectiveEngineerId
        ) {
            return NextResponse.json(
                { error: 'An engineer must be assigned before the job status can be updated.' },
                { status: 422 }
            );
        }

        const data: Prisma.JobUpdateInput = {};
        if (body.status !== undefined) data.status = body.status;
        if (body.assignedEngineerId !== undefined) {
            data.engineer = body.assignedEngineerId
                ? { connect: { id: body.assignedEngineerId } }
                : { disconnect: true };
        }
        if (body.repairNotes !== undefined) data.repairNotes = body.repairNotes;
        if (body.actualCost !== undefined) data.actualCost = body.actualCost;
        if (body.checklist !== undefined) data.checklist = body.checklist;
        if (body.rating !== undefined) data.rating = body.rating;
        if (body.feedback !== undefined) data.feedback = body.feedback;
        if (body.linkedJobId !== undefined) {
            data.linkedJob = body.linkedJobId
                ? { connect: { id: body.linkedJobId } }
                : { disconnect: true };
        }
        if (body.status === 'Completed') data.completedAt = new Date();
        // ── Editable core job fields (admin/reception) ────────────
        if (body.problemDescription !== undefined) data.problemDesc = body.problemDescription;
        if (body.estimatedCost !== undefined) data.estimatedCost = body.estimatedCost;
        if (body.advanceAmount !== undefined) data.advanceAmount = body.advanceAmount;
        if (body.paymentMethod !== undefined) data.paymentMethod = body.paymentMethod;

        const activitiesToCreate = [];
        if (body.status && body.status !== existingJob.status) {
            activitiesToCreate.push({ userId: auth.user.id, action: 'Status Updated', details: `Status changed from ${existingJob.status} to ${body.status}` });
        }
        // ── Rich reassignment log ─────────────────────────────────
        // Track every engineer change with actor, reason and timestamp.
        // Distinguishes first-time assignment from a transfer/handoff.
        if (body.assignedEngineerId !== undefined && body.assignedEngineerId !== existingJob.engineerId) {
            const isReassignment = !!existingJob.engineerId;
            const action = isReassignment ? 'Job Reassigned' : 'Engineer Assigned';
            // Resolve engineer names for the activity detail
            const [prevEng, newEng] = await Promise.all([
                existingJob.engineerId ? prisma.user.findUnique({ where: { id: existingJob.engineerId }, select: { name: true } }) : Promise.resolve(null),
                body.assignedEngineerId ? prisma.user.findUnique({ where: { id: body.assignedEngineerId }, select: { name: true } }) : Promise.resolve(null),
            ]);
            let details = '';
            if (isReassignment) {
                details = `Transferred from ${prevEng?.name ?? 'previous engineer'} → ${newEng?.name ?? 'new engineer'}`;
            } else {
                details = `Assigned to ${newEng?.name ?? 'engineer'}`;
            }
            if (body.reassignReason?.trim()) {
                details += `. Reason: ${body.reassignReason.trim()}`;
            }
            activitiesToCreate.push({ userId: auth.user.id, action, details });
        }
        // ── Job details edited log ────────────────────────────────
        if (body.problemDescription !== undefined && body.problemDescription !== existingJob.problemDesc) {
            activitiesToCreate.push({ userId: auth.user.id, action: 'Job Details Edited', details: 'Problem description was updated by admin/reception' });
        }
        if (body.estimatedCost !== undefined && body.estimatedCost !== existingJob.estimatedCost) {
            activitiesToCreate.push({ userId: auth.user.id, action: 'Job Details Edited', details: `Estimated cost updated to ₹${body.estimatedCost.toLocaleString()}` });
        }
        if (body.advanceAmount !== undefined && body.advanceAmount !== existingJob.advanceAmount) {
            activitiesToCreate.push({ userId: auth.user.id, action: 'Job Details Edited', details: `Advance amount updated to ₹${body.advanceAmount.toLocaleString()}` });
        }
        if (body.rating !== undefined && body.rating !== existingJob.rating) {
            activitiesToCreate.push({ userId: auth.user.id, action: 'CSAT Rated', details: `Customer rated ${body.rating} stars` });
        }
        if (activitiesToCreate.length > 0) {
            data.activities = { create: activitiesToCreate.map(act => withLocalBranchId(act)) };
        }

        const job = await prisma.job.update({
            where: { id: jobId },
            data,
            include: { activities: true }
        });

        // ── Outbox Sync ──────────────────────────────────────────────
        captureChange({
            entityType: 'Job',
            entityId: job.id,
            action: 'update',
            payload: job,
        }).catch(err => console.error('[SyncOutbox] Job update error:', err));

        if (job.activities) {
            for (const act of job.activities) {
                // If it is newly created in this request, capture it
                const isNew = activitiesToCreate.some(a => a.action === act.action && a.details === act.details);
                if (isNew) {
                    captureChange({
                        entityType: 'JobActivity',
                        entityId: act.id,
                        action: 'create',
                        payload: act,
                    }).catch(err => console.error('[SyncOutbox] JobActivity create error:', err));
                }
            }
        }

        // ── Audit log — field-level diff (PUT) ────────────────────────────
        {
            const actor = { id: auth.user.id, name: auth.user.name, role: auth.user.role };
            const auditBefore: Record<string, unknown> = {
                status:             existingJob.status,
                engineerId:         existingJob.engineerId,
                repairNotes:        existingJob.repairNotes,
                actualCost:         existingJob.actualCost,
                rating:             existingJob.rating,
                feedback:           existingJob.feedback,
                linkedJobId:        existingJob.linkedJobId,
                problemDesc:        existingJob.problemDesc,
                estimatedCost:      existingJob.estimatedCost,
                advanceAmount:      existingJob.advanceAmount,
                paymentMethod:      existingJob.paymentMethod,
            };
            const auditAfter: Record<string, unknown> = {
                status:             job.status,
                engineerId:         job.engineerId,
                repairNotes:        job.repairNotes,
                actualCost:         job.actualCost,
                rating:             job.rating,
                feedback:           job.feedback,
                linkedJobId:        job.linkedJobId,
                problemDesc:        job.problemDesc,
                estimatedCost:      job.estimatedCost,
                advanceAmount:      job.advanceAmount,
                paymentMethod:      job.paymentMethod,
            };
            auditDiff(actor, 'job', jobId, auditBefore, auditAfter).catch(() => {});
        }

        // ── Internal engineer notification (unchanged) ────────────
        if (body.assignedEngineerId) {
            const notif = await prisma.notification.create({
                data: withLocalBranchId({
                    userId: body.assignedEngineerId,
                    message: `Job assigned to you: ${job.problemDesc.substring(0, 60)}`,
                    jobId: job.id,
                }),
            });
            captureChange({
                entityType: 'Notification',
                entityId: notif.id,
                action: 'create',
                payload: notif,
            }).catch(err => console.error('[SyncOutbox] Notification create error:', err));
        }

        if (body.status && body.status !== existingJob.status && existingJob.engineerId) {
            const notif = await prisma.notification.create({
              data: withLocalBranchId({
                userId: existingJob.engineerId,
                message: `Job status updated to ${body.status}: ${job.problemDesc.substring(0, 50)}`,
                jobId: job.id,
              }),
            });
            captureChange({
                entityType: 'Notification',
                entityId: notif.id,
                action: 'create',
                payload: notif,
            }).catch(err => console.error('[SyncOutbox] Notification create error:', err));
          }


        // ── Customer SMS/email notification ───────────────────────
        const newStatus = body.status as string | undefined;
        const statusChanged = newStatus && newStatus !== existingJob.status;

        console.log(`[PUT] jobId=${jobId} oldStatus=${existingJob.status} newStatus=${newStatus} changed=${statusChanged}`);

        if (statusChanged && CUSTOMER_NOTIFY_STATUSES.has(newStatus as NotifiableStatus)) {
            // Awaited so the notification completes before the response is sent
            await sendCustomerNotification(job, newStatus as NotifiableStatus);
        }

        // ── Warranty SMS on completion (PUT) ──────────────────────
        if (newStatus === 'Completed' && statusChanged) {
            try {
                const [wCustomer, wDevice] = await Promise.all([
                    prisma.customer.findUnique({ where: { id: job.customerId } }),
                    prisma.device.findUnique({ where: { id: job.deviceId } }),
                ]);
                if (wCustomer) {
                    const warrantyDays = getWarrantyDaysServer(wDevice?.type);
                    if (warrantyDays > 0) {
                        await sendWarrantySms({
                            customerName: wCustomer.name,
                            phone: (wCustomer as any).phone ?? '',
                            jobId: job.id,
                            warrantyDays,
                            deviceInfo: wDevice
                                ? `${wDevice.brand} ${wDevice.type} (${wDevice.model})`
                                : undefined,
                            appBaseUrl: process.env.NEXT_PUBLIC_APP_URL,
                        });
                    }
                }
            } catch (err) {
                console.error('[warranty] Failed to send warranty SMS (PUT):', err);
            }
        }

        // ── Webhook: job.status_changed ───────────────────────────
        if (statusChanged) {
            fireWebhooks('job.status_changed', {
                jobId: job.id,
                previousStatus: existingJob.status,
                newStatus,
                customerId: job.customerId,
                deviceId: job.deviceId,
                estimatedCost: job.estimatedCost ?? 0,
                updatedAt: job.updatedAt.toISOString(),
            }).catch(err => console.error('[webhook PUT] fire error:', err));
        }

        if (statusChanged && newStatus === 'Completed') {
            if (job.linkedJobId) {
                addToTallyQueue({
                    entityType: 'warranty_claim',
                    entityId: job.id,
                    actionType: 'sync_warranty',
                    priority: 1,
                }).catch((err: any) => console.error('[Tally Auto-Queue Completed Warranty PUT] Error:', err));
            } else {
                addToTallyQueue({
                    entityType: 'job',
                    entityId: job.id,
                    actionType: 'sync_invoice',
                    priority: 1,
                }).catch((err: any) => console.error('[Tally Auto-Queue Completed Job PUT] Error:', err));
            }
        }

        if (statusChanged && newStatus === 'Delivered') {
            prisma.payment.findUnique({ where: { jobId: job.id } }).then((payment: any) => {
                if (payment) {
                    addToTallyQueue({
                        entityType: 'payment',
                        entityId: payment.id,
                        actionType: 'sync_receipt',
                        priority: 0,
                    }).catch((err: any) => console.error('[Tally Auto-Queue Delivered Receipt PUT] Error:', err));
                }
            }).catch((err: any) => console.error('[Tally Auto-Queue Delivered findPayment PUT] Error:', err));
        }

        return NextResponse.json({
            ...job,
            problemDescription: job.problemDesc,
            assignedEngineerId: job.engineerId,
            estimatedCost: job.estimatedCost ?? 0,
            advanceAmount: job.advanceAmount ?? 0,
            createdAt: job.createdAt.toISOString(),
            updatedAt: job.updatedAt.toISOString(),
            completedAt: job.completedAt?.toISOString() ?? undefined,
            activities: job.activities ? job.activities.map((a: any) => ({
                ...a,
                createdAt: a.createdAt.toISOString()
            })) : []
        });
    } catch (error) {
        if (error && typeof error === 'object' && 'code' in error) {
            const err = error as { code: string };
            if (err.code === 'P2025') {
                return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
            }
        }
        console.error('[api/jobs/[id] PUT]', error);
        return NextResponse.json({ error: 'Failed to update job.' }, { status: 500 });
    }
}

// ── PATCH /api/jobs/:id — engineers only ─────────────────────────
// Restricted update: status + repairNotes on their OWN assigned jobs only.
// Engineers cannot change cost, reassign the job, or touch other engineers' jobs.
const ENGINEER_ALLOWED_STATUSES = ['In Progress', 'Completed'] as const;
type EngineerAllowedStatus = typeof ENGINEER_ALLOWED_STATUSES[number];

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireSession(request, ['engineer']);
    if ('error' in auth) return auth.error;

    const { user } = auth;

    try {
        const { id: jobId } = await params;
        const validation = await validateBody(request, JobPatchSchema);
        if (!validation.success) return validation.errorResponse;
        const body = validation.data;

        // ── Validate status value ─────────────────────────────────
        if (body.status !== undefined && !ENGINEER_ALLOWED_STATUSES.includes(body.status)) {
            return NextResponse.json(
                { error: `Engineers may only set status to: ${ENGINEER_ALLOWED_STATUSES.join(', ')}.` },
                { status: 400 }
            );
        }

        // ── Ownership check — fetch job first ─────────────────────
        const existing = await prisma.job.findUnique({ where: { id: jobId } });

        if (!existing) {
            return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
        }

        if (existing.engineerId !== user.id) {
            return NextResponse.json(
                { error: 'You can only update jobs assigned to you.' },
                { status: 403 }
            );
        }

        // ── Bug 8: Engineer cannot update status on an unassigned job ─────
        if (body.status !== undefined && !existing.engineerId) {
            return NextResponse.json(
                { error: 'This job has no assigned engineer. Ask reception to assign it before updating.' },
                { status: 422 }
            );
        }

        // ── Bug 9: Block Completed when there are unapproved part requests ─
        if (body.status === 'Completed') {
            const pendingParts = await prisma.partRequest.findFirst({
                where: {
                    jobId,
                    status: 'Pending',
                },
                select: { id: true, partName: true },
            });

            if (pendingParts) {
                return NextResponse.json(
                    {
                        error: `Cannot complete this job — part request "${pendingParts.partName}" is still pending approval. Ask reception to approve or reject all parts first.`,
                    },
                    { status: 422 }
                );
            }
        }

        // ── Build safe update payload ─────────────────────────────
        const data: Prisma.JobUpdateInput = {};
        if (body.status !== undefined) data.status = body.status as EngineerAllowedStatus;
        if (body.repairNotes !== undefined) data.repairNotes = body.repairNotes;
        if (body.checklist !== undefined) data.checklist = body.checklist;
        if (body.status === 'Completed') data.completedAt = new Date();

        const activitiesToCreate = [];
        if (body.status && body.status !== existing.status) {
            activitiesToCreate.push({ userId: auth.user.id, action: 'Status Updated', details: `Status changed from ${existing.status} to ${body.status}` });
        }
        if (body.checklist !== undefined && JSON.stringify(body.checklist) !== JSON.stringify(existing.checklist)) {
            activitiesToCreate.push({ userId: auth.user.id, action: 'Checklist Updated', details: 'The repair checklist was modified' });
        }
        if (activitiesToCreate.length > 0) {
            data.activities = { create: activitiesToCreate.map(act => withLocalBranchId(act)) };
        }

        const job = await prisma.job.update({
            where: { id: jobId },
            data,
            include: { activities: true }
        });

        // ── Outbox Sync ──────────────────────────────────────────────
        captureChange({
            entityType: 'Job',
            entityId: job.id,
            action: 'update',
            payload: job,
        }).catch(err => console.error('[SyncOutbox] Job update error:', err));

        if (job.activities) {
            for (const act of job.activities) {
                const isNew = activitiesToCreate.some(a => a.action === act.action && a.details === act.details);
                if (isNew) {
                    captureChange({
                        entityType: 'JobActivity',
                        entityId: act.id,
                        action: 'create',
                        payload: act,
                    }).catch(err => console.error('[SyncOutbox] JobActivity create error:', err));
                }
            }
        }


        // ── Audit log — field-level diff (PATCH) ────────────────────────
        {
            const actor = { id: auth.user.id, name: auth.user.name, role: auth.user.role };
            const auditBefore: Record<string, unknown> = {
                status:      existing.status,
                repairNotes: existing.repairNotes,
                checklist:   existing.checklist,
            };
            const auditAfter: Record<string, unknown> = {
                status:      job.status,
                repairNotes: job.repairNotes,
                checklist:   job.checklist,
            };
            auditDiff(actor, 'job', jobId, auditBefore, auditAfter).catch(() => {});
        }

        // ── Customer SMS/email notification ───────────────────────
        const newStatus = body.status as string | undefined;
        const statusChanged = newStatus && newStatus !== existing.status;

        console.log(`[PATCH] jobId=${jobId} oldStatus=${existing.status} newStatus=${newStatus} changed=${statusChanged}`);

        if (statusChanged && CUSTOMER_NOTIFY_STATUSES.has(newStatus as NotifiableStatus)) {
            // Awaited so the notification completes before the response is sent
            await sendCustomerNotification(job, newStatus as NotifiableStatus);
        }

        // ── Warranty SMS on completion (PATCH) ────────────────────
        if (newStatus === 'Completed' && statusChanged) {
            try {
                const [wCustomer, wDevice] = await Promise.all([
                    prisma.customer.findUnique({ where: { id: job.customerId } }),
                    prisma.device.findUnique({ where: { id: job.deviceId } }),
                ]);
                if (wCustomer) {
                    const warrantyDays = getWarrantyDaysServer(wDevice?.type);
                    if (warrantyDays > 0) {
                        await sendWarrantySms({
                            customerName: wCustomer.name,
                            phone: wCustomer.phone,
                            jobId: job.id,
                            warrantyDays,
                            deviceInfo: wDevice
                                ? `${wDevice.brand} ${wDevice.type} (${wDevice.model})`
                                : undefined,
                            appBaseUrl: process.env.NEXT_PUBLIC_APP_URL,
                        });
                    }
                }
            } catch (err) {
                console.error('[warranty] Failed to send warranty SMS (PATCH):', err);
            }
        }

        // ── Webhook: job.status_changed ───────────────────────────
        if (statusChanged) {
            fireWebhooks('job.status_changed', {
                jobId: job.id,
                previousStatus: existing.status,
                newStatus,
                customerId: job.customerId,
                deviceId: job.deviceId,
                estimatedCost: job.estimatedCost ?? 0,
                updatedAt: job.updatedAt.toISOString(),
            }).catch(err => console.error('[webhook PATCH] fire error:', err));
        }

        if (statusChanged && newStatus === 'Completed') {
            if (job.linkedJobId) {
                addToTallyQueue({
                    entityType: 'warranty_claim',
                    entityId: job.id,
                    actionType: 'sync_warranty',
                    priority: 1,
                }).catch((err: any) => console.error('[Tally Auto-Queue Completed Warranty PATCH] Error:', err));
            } else {
                addToTallyQueue({
                    entityType: 'job',
                    entityId: job.id,
                    actionType: 'sync_invoice',
                    priority: 1,
                }).catch((err: any) => console.error('[Tally Auto-Queue Completed Job PATCH] Error:', err));
            }
        }

        if (statusChanged && newStatus === 'Delivered') {
            prisma.payment.findUnique({ where: { jobId: job.id } }).then((payment: any) => {
                if (payment) {
                    addToTallyQueue({
                        entityType: 'payment',
                        entityId: payment.id,
                        actionType: 'sync_receipt',
                        priority: 0,
                    }).catch((err: any) => console.error('[Tally Auto-Queue Delivered Receipt PATCH] Error:', err));
                }
            }).catch((err: any) => console.error('[Tally Auto-Queue Delivered findPayment PATCH] Error:', err));
        }

        return NextResponse.json({
            ...job,
            problemDescription: job.problemDesc,
            assignedEngineerId: job.engineerId,
            estimatedCost: job.estimatedCost ?? 0,
            advanceAmount: job.advanceAmount ?? 0,
            createdAt: job.createdAt.toISOString(),
            updatedAt: job.updatedAt.toISOString(),
            completedAt: job.completedAt?.toISOString() ?? undefined,
            activities: job.activities ? job.activities.map((a: any) => ({
                ...a,
                createdAt: a.createdAt.toISOString()
            })) : []
        });
    } catch (error) {
        if (error && typeof error === 'object' && 'code' in error) {
            const err = error as { code: string };
            if (err.code === 'P2025') {
                return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
            }
        }
        console.error('[api/jobs/[id] PATCH]', error);
        return NextResponse.json({ error: 'Failed to update job.' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireSession(request, ['admin', 'reception']);
    if ('error' in auth) return auth.error;

    const { id: jobId } = await params;
    if (!jobId) return NextResponse.json({ error: 'Job id is required.' }, { status: 400 });

    try {
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            select: { status: true },
        });

        if (!job) return NextResponse.json({ error: 'Job not found.' }, { status: 404 });

        if (job.status === 'In Progress') {
            return NextResponse.json(
                { error: 'Cannot delete a job that is In Progress. Change the status first.' },
                { status: 409 }
            );
        }

        // Delete related records first to satisfy foreign-key constraints,
        // then delete the job itself — all in one atomic transaction.
        await prisma.$transaction([
            prisma.partRequest.deleteMany({ where: { jobId } }),
            prisma.payment.deleteMany({ where: { jobId } }),
            prisma.notification.deleteMany({ where: { jobId } }),
            prisma.job.delete({ where: { id: jobId } }),
        ]);

        // ── Outbox Sync ──────────────────────────────────────────────
        captureChange({
            entityType: 'Job',
            entityId: jobId,
            action: 'delete',
            payload: {},
        }).catch(err => console.error('[SyncOutbox] Job delete error:', err));


        // ── Audit log — job deleted ────────────────────────────────
        writeAuditLog({
            actor: { id: auth.user.id, name: auth.user.name, role: auth.user.role },
            action: 'delete',
            entity: 'job',
            entityId: jobId,
            meta: { previousStatus: job.status },
        }).catch(() => {});

        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error && typeof error === 'object' && 'code' in error) {
            const err = error as { code: string };
            if (err.code === 'P2025') {
                return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
            }
        }
        console.error('[api/jobs/[id] DELETE]', error);
        return NextResponse.json({ error: 'Failed to delete job.' }, { status: 500 });
    }
}
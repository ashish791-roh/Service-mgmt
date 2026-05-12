import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, LIMITS, checkLengths } from '@/lib/auth';
import {
    notifyCustomerStatusChange,
    type NotifiableStatus,
} from '@/lib/customerNotifications';

// Statuses that trigger a customer-facing notification
const CUSTOMER_NOTIFY_STATUSES = new Set<NotifiableStatus>([
    'Assigned',
    'In Progress',
    'Completed',
    'Delivered',
]);

// ── Helper: fetch customer + device and send notification ─────────
async function sendCustomerNotification(
    job: any,
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
            email: (customer as any).email ?? null,
            jobId: job.id,
            newStatus,
            deviceInfo,
        });

        console.log(`[notification] Done for job ${job.id}`);
    } catch (err) {
        console.error(`[notification] Failed for job ${job.id}:`, err);
    }
}

// ── PUT /api/jobs/:id — admin or reception only ───────────────────
// Full update: can reassign engineer, change cost, update status, etc.
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireSession(['admin', 'reception']);
    if ('error' in auth) return auth.error;

    try {
        const { id: jobId } = await params;
        const body = await request.json();

        const lengthError = checkLengths([
            [body.repairNotes, 'repairNotes', LIMITS.notes],
        ]);
        if (lengthError) {
            return NextResponse.json({ error: lengthError }, { status: 400 });
        }

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

        const data: any = {};
        if (body.status !== undefined) data.status = body.status;
        if (body.assignedEngineerId !== undefined) data.engineerId = body.assignedEngineerId;
        if (body.repairNotes !== undefined) data.repairNotes = body.repairNotes;
        if (body.actualCost !== undefined) data.actualCost = parseFloat(body.actualCost);
        if (body.checklist !== undefined) data.checklist = body.checklist;
        if (body.rating !== undefined) data.rating = parseInt(body.rating, 10);
        if (body.feedback !== undefined) data.feedback = body.feedback;
        if (body.linkedJobId !== undefined) data.linkedJobId = body.linkedJobId;
        if (body.status === 'Completed') data.completedAt = new Date();

        const activitiesToCreate = [];
        if (body.status && body.status !== existingJob.status) {
            activitiesToCreate.push({ userId: auth.user.id, action: 'Status Updated', details: `Status changed from ${existingJob.status} to ${body.status}` });
        }
        if (body.assignedEngineerId && body.assignedEngineerId !== existingJob.engineerId) {
            activitiesToCreate.push({ userId: auth.user.id, action: 'Engineer Assigned', details: 'A new engineer was assigned to this job' });
        }
        if (body.rating !== undefined && body.rating !== existingJob.rating) {
            activitiesToCreate.push({ userId: auth.user.id, action: 'CSAT Rated', details: `Customer rated ${body.rating} stars` });
        }
        if (activitiesToCreate.length > 0) {
            data.activities = { create: activitiesToCreate };
        }

        const job = await prisma.job.update({
            where: { id: jobId },
            data,
            include: { activities: true }
        });

        // ── Internal engineer notification (unchanged) ────────────
        if (body.assignedEngineerId) {
            await prisma.notification.create({
                data: {
                    userId: body.assignedEngineerId,
                    message: `Job assigned to you: ${job.problemDesc.substring(0, 60)}`,
                    jobId: job.id,
                },
            });
        }

        if (body.status && body.status !== existingJob.status && existingJob.engineerId) {
            await prisma.notification.create({
              data: {
                userId: existingJob.engineerId,
                message: `Job status updated to ${body.status}: ${job.problemDesc.substring(0, 50)}`,
                jobId: job.id,
              },
            });
          }

        // ── Customer SMS/email notification ───────────────────────
        const newStatus = body.status as string | undefined;
        const statusChanged = newStatus && newStatus !== existingJob.status;

        console.log(`[PUT] jobId=${jobId} oldStatus=${existingJob.status} newStatus=${newStatus} changed=${statusChanged}`);

        if (statusChanged && CUSTOMER_NOTIFY_STATUSES.has(newStatus as NotifiableStatus)) {
            // Awaited so the notification completes before the response is sent
            await sendCustomerNotification(job, newStatus as NotifiableStatus);
        }

        return NextResponse.json({
            ...job,
            problemDescription: job.problemDesc,
            assignedEngineerId: job.engineerId,
            estimatedCost: job.estimatedCost ?? 0,
            createdAt: job.createdAt.toISOString(),
            updatedAt: job.updatedAt.toISOString(),
            completedAt: job.completedAt?.toISOString() ?? undefined,
            activities: job.activities ? job.activities.map((a: any) => ({
                ...a,
                createdAt: a.createdAt.toISOString()
            })) : []
        });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Job not found.' }, { status: 404 })
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
    const auth = await requireSession(['engineer']);
    if ('error' in auth) return auth.error;

    const { user } = auth;

    try {
        const { id: jobId } = await params;
        const body = await request.json();

        // ── Validate status value ─────────────────────────────────
        if (body.status !== undefined && !ENGINEER_ALLOWED_STATUSES.includes(body.status)) {
            return NextResponse.json(
                { error: `Engineers may only set status to: ${ENGINEER_ALLOWED_STATUSES.join(', ')}.` },
                { status: 400 }
            );
        }

        // ── Validate repairNotes length ───────────────────────────
        const lengthError = checkLengths([
            [body.repairNotes, 'repairNotes', LIMITS.notes],
        ]);
        if (lengthError) {
            return NextResponse.json({ error: lengthError }, { status: 400 });
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
        // This is a safeguard — engineers should only ever see their own jobs
        // (filtered client-side), but the API enforces the rule independently.
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
        const data: any = {};
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
            data.activities = { create: activitiesToCreate };
        }

        const job = await prisma.job.update({
            where: { id: jobId },
            data,
            include: { activities: true }
        });

        // ── Customer SMS/email notification ───────────────────────
        const newStatus = body.status as string | undefined;
        const statusChanged = newStatus && newStatus !== existing.status;

        console.log(`[PATCH] jobId=${jobId} oldStatus=${existing.status} newStatus=${newStatus} changed=${statusChanged}`);

        if (statusChanged && CUSTOMER_NOTIFY_STATUSES.has(newStatus as NotifiableStatus)) {
            // Awaited so the notification completes before the response is sent
            await sendCustomerNotification(job, newStatus as NotifiableStatus);
        }

        return NextResponse.json({
            ...job,
            problemDescription: job.problemDesc,
            assignedEngineerId: job.engineerId,
            estimatedCost: job.estimatedCost ?? 0,
            createdAt: job.createdAt.toISOString(),
            updatedAt: job.updatedAt.toISOString(),
            completedAt: job.completedAt?.toISOString() ?? undefined,
            activities: job.activities ? job.activities.map((a: any) => ({
                ...a,
                createdAt: a.createdAt.toISOString()
            })) : []
        });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
        }
        console.error('[api/jobs/[id] PATCH]', error);
        return NextResponse.json({ error: 'Failed to update job.' }, { status: 500 });
    }
}
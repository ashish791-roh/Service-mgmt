import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, LIMITS, checkLengths } from '@/lib/auth';

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

        const data: any = {};
        if (body.status !== undefined) data.status = body.status;
        if (body.assignedEngineerId !== undefined) data.engineerId = body.assignedEngineerId;
        if (body.repairNotes !== undefined) data.repairNotes = body.repairNotes;
        if (body.actualCost !== undefined) data.actualCost = parseFloat(body.actualCost);
        if (body.status === 'Completed') data.completedAt = new Date();

        const job = await prisma.job.update({
            where: { id: jobId },
            data,
        });

        if (body.assignedEngineerId) {
            await prisma.notification.create({
                data: {
                    userId: body.assignedEngineerId,
                    message: `Job assigned to you: ${job.problemDesc.substring(0, 60)}`,
                    jobId: job.id,
                },
            });
        }

        return NextResponse.json({
            ...job,
            problemDescription: job.problemDesc,
            assignedEngineerId: job.engineerId,
            estimatedCost: job.estimatedCost ?? 0,
            createdAt: job.createdAt.toISOString(),
            updatedAt: job.updatedAt.toISOString(),
            completedAt: job.completedAt?.toISOString() ?? undefined,
        });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
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

        // ── Validate repairNotes length ────────────────────────
        const lengthError = checkLengths([
            [body.repairNotes, 'repairNotes', LIMITS.notes],
        ]);
        if (lengthError) {
            return NextResponse.json({ error: lengthError }, { status: 400 });
        }

        // ── Ownership check — fetch job first ──────────────────
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

        // ── Build safe update payload — engineers can only set these two fields
        const data: any = {};
        if (body.status !== undefined) data.status = body.status as EngineerAllowedStatus;
        if (body.repairNotes !== undefined) data.repairNotes = body.repairNotes;
        if (body.status === 'Completed') data.completedAt = new Date();

        const job = await prisma.job.update({
            where: { id: jobId },
            data,
        });

        return NextResponse.json({
            ...job,
            problemDescription: job.problemDesc,
            assignedEngineerId: job.engineerId,
            estimatedCost: job.estimatedCost ?? 0,
            createdAt: job.createdAt.toISOString(),
            updatedAt: job.updatedAt.toISOString(),
            completedAt: job.completedAt?.toISOString() ?? undefined,
        });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
        }
        console.error('[api/jobs/[id] PATCH]', error);
        return NextResponse.json({ error: 'Failed to update job.' }, { status: 500 });
    }
}
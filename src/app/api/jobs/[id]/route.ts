import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, LIMITS, checkLengths } from '@/lib/auth';

// PUT /api/jobs/:id — admin or reception
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
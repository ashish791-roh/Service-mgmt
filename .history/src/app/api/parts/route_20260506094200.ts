import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, LIMITS, checkLengths } from '@/lib/auth';

// POST /api/parts — engineers submit part requests; admin/reception may also
export async function POST(request: Request) {
    const auth = await requireSession(['admin', 'reception', 'engineer']);
    if ('error' in auth) return auth.error;

    try {
        const body = await request.json();

        if (!body.jobId || !body.engineerId || !body.partName || !body.quantity || !body.reason) {
            return NextResponse.json(
                { error: 'jobId, engineerId, partName, quantity and reason are required.' },
                { status: 400 }
            );
        }

        // Input length caps
        const lengthError = checkLengths([
            [body.partName, 'partName', LIMITS.shortText],
            [body.reason, 'reason', LIMITS.text],
        ]);
        if (lengthError) {
            return NextResponse.json({ error: lengthError }, { status: 400 });
        }

        // Engineers can only submit requests for themselves
        if (auth.user.role === 'engineer' && body.engineerId !== auth.user.id) {
            return NextResponse.json(
                { error: 'Engineers may only submit part requests for themselves.' },
                { status: 403 }
            );
        }

        const partRequest = await prisma.partRequest.create({
            data: {
                jobId: body.jobId,
                engineerId: body.engineerId,
                partName: body.partName.trim(),
                quantity: Number(body.quantity),
                reason: body.reason.trim(),
                status: 'Pending',
            },
        });

        return NextResponse.json({
            ...partRequest,
            createdAt: partRequest.createdAt.toISOString(),
            updatedAt: partRequest.updatedAt.toISOString(),
            reviewedAt: partRequest.reviewedAt?.toISOString() ?? undefined,
        }, { status: 201 });
    } catch (error) {
        console.error('[api/parts POST]', error);
        return NextResponse.json({ error: 'Failed to create part request.' }, { status: 500 });
    }
}

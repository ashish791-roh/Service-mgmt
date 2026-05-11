import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';

// PUT /api/parts/:id — approve/reject a part request; admin or reception only
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireSession(['admin', 'reception']);
    if ('error' in auth) return auth.error;

    try {
        const { id } = await params;
        const body = await request.json();

        if (!body.status || !['Approved', 'Rejected'].includes(body.status)) {
            return NextResponse.json({ error: 'status must be "Approved" or "Rejected".' }, { status: 400 });
        }

        const partRequest = await prisma.partRequest.update({
            where: { id },
            data: {
                status: body.status,
                reviewedAt: new Date(),
            },
        });

        await prisma.notification.create({
            data: {
                userId: partRequest.engineerId,
                message: `Part request "${partRequest.partName}" has been ${body.status.toLowerCase()}.`,
                jobId: partRequest.jobId,
            },
        });

        return NextResponse.json({
            ...partRequest,
            createdAt: partRequest.createdAt.toISOString(),
            updatedAt: partRequest.updatedAt.toISOString(),
            reviewedAt: partRequest.reviewedAt?.toISOString() ?? undefined,
        });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Part request not found.' }, { status: 404 });
        }
        console.error('[api/parts/[id] PUT]', error);
        return NextResponse.json({ error: 'Failed to update part request.' }, { status: 500 });
    }
}
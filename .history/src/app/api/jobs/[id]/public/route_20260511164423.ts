import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/jobs/:id/public — no authentication required
// Returns only the fields a customer needs to track their repair.
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: jobId } = await params;

        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: { photos: true },
        });

        if (!job) {
            return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
        }

        // Fetch device info for display (brand + type + model)
        const device = job.deviceId
            ? await prisma.device.findUnique({ where: { id: job.deviceId } })
            : null;

        // Return only customer-safe fields — no internal costs, engineer names, etc.
        return NextResponse.json({
            id: job.id,
            status: job.status,
            problemDesc: job.problemDesc,
            createdAt: job.createdAt?.toISOString() ?? null,
            completedAt: job.completedAt?.toISOString() ?? null,
            updatedAt: job.updatedAt?.toISOString() ?? null,
            device: device
                ? { brand: device.brand, type: device.type, model: device.model }
                : null,
            photos: job.photos.map((p: any) => ({
                id: p.id,
                url: p.url,
                type: p.type,
                createdAt: p.createdAt.toISOString()
            })),
        });
    } catch (error) {
        console.error('[api/jobs/[id]/public GET]', error);
        return NextResponse.json({ error: 'Failed to fetch job.' }, { status: 500 });
    }
}
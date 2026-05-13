import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ── Default SLA hours (mirrors DEFAULT_SLA_TIERS in lib/sla.ts) ───────────────
const SLA_HOURS: Record<string, { warning: number; critical: number }> = {
    phone:   { warning: 24, critical: 48 },
    laptop:  { warning: 48, critical: 72 },
    tablet:  { warning: 36, critical: 60 },
    desktop: { warning: 48, critical: 96 },
    other:   { warning: 48, critical: 72 },
};

function getSlaHours(deviceType: string | null | undefined) {
    const key = (deviceType ?? '').toLowerCase();
    return SLA_HOURS[key] ?? SLA_HOURS['other'];
}

function computeEta(
    status: string | null,
    createdAt: Date | null,
    completedAt: Date | null,
    deviceType: string | null | undefined,
) {
    const terminalStatuses = ['Completed', 'Delivered'];
    if (status && terminalStatuses.includes(status)) {
        return {
            etaIso: completedAt?.toISOString() ?? null,
            isOverdue: false,
            isReady: true,
            etaLabel: status === 'Delivered' ? 'Device delivered' : 'Ready for pickup',
        };
    }

    if (!createdAt) {
        return { etaIso: null, isOverdue: false, isReady: false, etaLabel: 'Awaiting assessment' };
    }

    const { critical } = getSlaHours(deviceType);
    const eta = new Date(createdAt.getTime() + critical * 60 * 60 * 1000);
    const now = new Date();
    const isOverdue = eta < now;

    const diffMs = Math.abs(eta.getTime() - now.getTime());
    const diffH = Math.floor(diffMs / 3_600_000);
    const diffM = Math.floor((diffMs % 3_600_000) / 60_000);

    let etaLabel: string;
    if (isOverdue) {
        etaLabel = diffH > 0 ? `${diffH}h ${diffM}m overdue` : `${diffM}m overdue`;
    } else if (diffH === 0) {
        etaLabel = `~${diffM}m remaining`;
    } else {
        etaLabel = `~${diffH}h ${diffM}m remaining`;
    }

    return { etaIso: eta.toISOString(), isOverdue, isReady: false, etaLabel };
}

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

        const eta = computeEta(job.status, job.createdAt, job.completedAt, device?.type);

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
            eta,
        });
    } catch (error) {
        console.error('[api/jobs/[id]/public GET]', error);
        return NextResponse.json({ error: 'Failed to fetch job.' }, { status: 500 });
    }
}

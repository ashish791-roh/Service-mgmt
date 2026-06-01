import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { JobPhoto } from '@prisma/client';

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

/**
 * Estimate pickup time for a job.
 *
 * Logic:
 *  - Completed / Delivered → already done, no ETA.
 *  - Use the SLA critical-hours threshold for the device type as the target.
 *  - ETA = createdAt + criticalHours. If that is in the past → overdue.
 */
function computeEta(
    status: string | null,
    createdAt: Date | null,
    completedAt: Date | null,
    deviceType: string | null | undefined,
): {
    etaIso: string | null;
    isOverdue: boolean;
    isReady: boolean;
    etaLabel: string;
} {
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

    // Human-readable label
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

// ── GET /api/track?phone=xxx  OR  /api/track?jobId=xxx ───────────────────────
// Fully public — no authentication required.
// Returns a slim summary of matching jobs for the customer self-service portal.
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const phone = searchParams.get('phone')?.trim();
        const jobId = searchParams.get('jobId')?.trim();

        if (!phone && !jobId) {
            return NextResponse.json(
                { error: 'Provide phone or jobId.' },
                { status: 400 }
            );
        }

        // ── Look up by Job ID ──────────────────────────────────────────────────
        if (jobId) {
            const job = await prisma.job.findUnique({
                where: { id: jobId },
                include: { photos: true },
            });

            if (!job) {
                return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
            }

            const device = job.deviceId
                ? await prisma.device.findUnique({ where: { id: job.deviceId } })
                : null;

            const eta = computeEta(job.status, job.createdAt, job.completedAt, device?.type);

            return NextResponse.json({
                jobs: [
                    {
                        id: job.id,
                        status: job.status,
                        problemDesc: job.problemDesc,
                        createdAt: job.createdAt?.toISOString() ?? null,
                        completedAt: job.completedAt?.toISOString() ?? null,
                        updatedAt: job.updatedAt?.toISOString() ?? null,
                        device: device
                            ? { brand: device.brand, type: device.type, model: device.model }
                            : null,
                        photos: job.photos.map((p: JobPhoto) => ({
                            id: p.id,
                            url: p.url,
                            type: p.type,
                            createdAt: p.createdAt.toISOString(),
                        })),
                        eta,
                    },
                ],
            });
        }

        // ── Look up by Phone ───────────────────────────────────────────────────
        // Normalise: strip spaces/dashes, keep digits and leading +
        const normalised = phone!.replace(/[\s\-().]/g, '');

        const customer = await prisma.customer.findFirst({
            where: { phone: { contains: normalised } },
        });

        if (!customer) {
            return NextResponse.json(
                { error: 'No account found for that phone number.' },
                { status: 404 }
            );
        }

        const jobs = await prisma.job.findMany({
            where: { customerId: customer.id },
            include: { photos: true },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });

        const deviceIds = [...new Set(jobs.map((j) => j.deviceId).filter(Boolean))] as string[];
        const devices = await prisma.device.findMany({
            where: { id: { in: deviceIds } },
        });
        const deviceMap = Object.fromEntries(devices.map((d) => [d.id, d]));

        const payload = jobs.map((job) => {
            const device = job.deviceId ? deviceMap[job.deviceId] ?? null : null;
            const eta = computeEta(job.status, job.createdAt, job.completedAt, device?.type);

            return {
                id: job.id,
                status: job.status,
                problemDesc: job.problemDesc,
                createdAt: job.createdAt?.toISOString() ?? null,
                completedAt: job.completedAt?.toISOString() ?? null,
                updatedAt: job.updatedAt?.toISOString() ?? null,
                device: device
                    ? { brand: device.brand, type: device.type, model: device.model }
                    : null,
                photos: job.photos.map((p: JobPhoto) => ({
                    id: p.id,
                    url: p.url,
                    type: p.type,
                    createdAt: p.createdAt.toISOString(),
                })),
                eta,
            };
        });

        return NextResponse.json({ jobs: payload, customerName: customer.name });
    } catch (error) {
        console.error('[api/track GET]', error);
        return NextResponse.json({ error: 'Failed to fetch jobs.' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, LIMITS, checkLengths } from '@/lib/auth';
import { rateLimiter, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';

// POST /api/devices — admin or reception
export async function POST(request: Request) {
    const auth = await requireSession(['admin', 'reception']);
    if ('error' in auth) return auth.error;

    // ── Rate limiting ─────────────────────────────────────────────
    const ip = getClientIP(request);
    const limit = await rateLimiter.check(
        `api:devices:${auth.user.id}:${ip}`,
        RATE_LIMITS.MODERATE
    );
    if (limit.isLimited) {
        return NextResponse.json(
            { error: `Too many requests. Try again in ${limit.retryAfter} seconds.` },
            { status: 429, headers: { 'Retry-After': limit.retryAfter.toString() } }
        );
    }

    try {
        const body = await request.json();

        if (!body.customerId || !body.type || !body.brand || !body.model) {
            return NextResponse.json({ error: 'customerId, type, brand and model are required.' }, { status: 400 });
        }

        // Input length caps
        const lengthError = checkLengths([
            [body.type, 'type', LIMITS.shortText],
            [body.brand, 'brand', LIMITS.shortText],
            [body.model, 'model', LIMITS.shortText],
            [body.serialNumber || body.serialNo, 'serialNumber', LIMITS.shortText],
        ]);
        if (lengthError) {
            return NextResponse.json({ error: lengthError }, { status: 400 });
        }

        const device = await prisma.device.create({
            data: {
                customerId: body.customerId,
                type: body.type.trim(),
                brand: body.brand.trim(),
                model: body.model.trim(),
                serialNo: body.serialNumber?.trim() || body.serialNo?.trim() || null,
            },
        });

        return NextResponse.json({
            ...device,
            serialNumber: device.serialNo,
            createdAt: device.createdAt.toISOString(),
        }, { status: 201 });
    } catch (error) {
        console.error('[api/devices POST]', error);
        return NextResponse.json({ error: 'Failed to create device.' }, { status: 500 });
    }
}
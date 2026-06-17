import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { getClientIP, rateLimiter, RATE_LIMITS } from '@/lib/rateLimit';
import { z } from 'zod';
import { validateGstinChecksum } from '@/lib/gst';

const BusinessSettingsSchema = z.object({
  shopName: z.string().min(1).max(255),
  tagline: z.string().min(1).max(255),
  address: z.string().min(1).max(1000),
  phone: z.string().min(1).max(50),
  email: z.string().email().max(255),
  gstin: z.string().min(15).max(15).refine(validateGstinChecksum, {
    message: 'Invalid GSTIN checksum.',
  }),
  taxRate: z.coerce.number().min(0).max(100),
  taxLabel: z.string().min(1).max(50),
});

export async function GET(request: Request) {
  const auth = await requireSession(request, ['admin', 'reception']);
  if ('error' in auth) return auth.error;

  const ip = getClientIP(request);
  const limit = await rateLimiter.check(`api:business-settings:get:${auth.user.id}:${ip}`, RATE_LIMITS.MODERATE);
  if (limit.isLimited) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${limit.retryAfter} seconds.` },
      { status: 429, headers: { 'Retry-After': limit.retryAfter.toString() } }
    );
  }

  try {
    let settings = await prisma.businessSettings.findUnique({
      where: { id: 'business-settings' },
    });

    if (!settings) {
      settings = await prisma.businessSettings.create({
        data: {
          id: 'business-settings',
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[api/business-settings GET]', error);
    return NextResponse.json({ error: 'Failed to load business settings.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireSession(request, ['admin']);
  if ('error' in auth) return auth.error;

  const ip = getClientIP(request);
  const limit = await rateLimiter.check(`api:business-settings:put:${auth.user.id}:${ip}`, RATE_LIMITS.MODERATE);
  if (limit.isLimited) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${limit.retryAfter} seconds.` },
      { status: 429, headers: { 'Retry-After': limit.retryAfter.toString() } }
    );
  }

  try {
    const body = await request.json();
    const parsed = BusinessSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const validatedData = parsed.data;

    const settings = await prisma.businessSettings.upsert({
      where: { id: 'business-settings' },
      create: {
        id: 'business-settings',
        ...validatedData,
      },
      update: validatedData,
    });

    // ── HQ Config Broadcast ──────────────────────────────────────
    const { getDeploymentRole } = await import('@/lib/branchContext');
    if (getDeploymentRole() === 'hq') {
      const { createDirective } = await import('@/lib/hqSyncEngine');
      await createDirective('business_settings', settings);
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[api/business-settings PUT]', error);
    return NextResponse.json({ error: 'Failed to update business settings.' }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getClientIP, rateLimiter, RATE_LIMITS } from '@/lib/rateLimit';
import { getTallySettings, saveTallySettings, syncTallyMasters } from '@/lib/tally';
import { z } from 'zod';

function isLoopbackOrPrivate(host: string): boolean {
  const trimmed = host.trim().toLowerCase();
  if (trimmed === 'localhost' || trimmed === '127.0.0.1' || trimmed === '::1' || trimmed === '0.0.0.0') return true;
  if (trimmed.startsWith('10.') || trimmed.startsWith('192.168.') || trimmed.startsWith('169.254.')) return true;
  const parts = trimmed.split('.');
  if (parts.length === 4 && parts[0] === '172') {
    const second = parseInt(parts[1], 10);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

const TallySettingsSchema = z.object({
  enabled: z.boolean(),
  host: z.string().min(1).max(255),
  port: z.coerce.number().int().min(1).max(65535),
  companyName: z.string().min(1).max(255),
  syncStatus: z.string().optional(),
  lastTestedAt: z.string().optional(),
  mockMode: z.boolean().optional(),
  autoPushOnApproval: z.boolean().optional(),
}).refine((data) => {
  const isMock = data.mockMode === true;
  const isLocalAllowed = process.env.NODE_ENV === 'development' || isMock;
  if (isLocalAllowed) return true;
  return !isLoopbackOrPrivate(data.host);
}, {
  message: 'Local or private host addresses are not allowed to prevent SSRF.',
  path: ['host'],
});

export async function GET(request: Request) {
  const auth = await requireSession(request, ['admin']);
  if ('error' in auth) return auth.error;

  const ip = getClientIP(request);
  const limit = await rateLimiter.check(`api:tally:settings:get:${auth.user.id}:${ip}`, RATE_LIMITS.MODERATE);
  if (limit.isLimited) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${limit.retryAfter} seconds.` },
      { status: 429, headers: { 'Retry-After': limit.retryAfter.toString() } }
    );
  }

  try {
    const settings = await getTallySettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[api/tally/settings GET]', error);
    return NextResponse.json({ error: 'Failed to load Tally settings.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireSession(request, ['admin']);
  if ('error' in auth) return auth.error;

  const ip = getClientIP(request);
  const limit = await rateLimiter.check(`api:tally:settings:post:${auth.user.id}:${ip}`, RATE_LIMITS.MODERATE);
  if (limit.isLimited) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${limit.retryAfter} seconds.` },
      { status: 429, headers: { 'Retry-After': limit.retryAfter.toString() } }
    );
  }

  try {
    const body = await request.json();
    const parsed = TallySettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const validatedData = parsed.data;

    await saveTallySettings({
      enabled: validatedData.enabled,
      host: validatedData.host,
      port: validatedData.port,
      companyName: validatedData.companyName,
      syncStatus: validatedData.syncStatus,
      lastTestedAt: validatedData.lastTestedAt,
      mockMode: validatedData.mockMode,
      autoPushOnApproval: validatedData.autoPushOnApproval,
    });

    const settings = await getTallySettings();

    if (settings.enabled) {
      syncTallyMasters(settings).catch((err) => {
        console.error('[Settings Save Sync] Failed to sync Tally masters in background:', err);
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[api/tally/settings POST]', error);
    return NextResponse.json({ error: 'Failed to save Tally settings.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getClientIP, rateLimiter, RATE_LIMITS } from '@/lib/rateLimit';
import { getTallySettings, saveTallySettings } from '@/lib/tally';

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
    const settings = await saveTallySettings({
      enabled: body.enabled,
      host: body.host,
      port: Number(body.port ?? 0),
      companyName: body.companyName,
      syncStatus: body.syncStatus,
      lastTestedAt: body.lastTestedAt,
    });
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[api/tally/settings POST]', error);
    return NextResponse.json({ error: 'Failed to save Tally settings.' }, { status: 500 });
  }
}

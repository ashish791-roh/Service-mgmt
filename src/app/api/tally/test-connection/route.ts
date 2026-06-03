import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getClientIP, rateLimiter, RATE_LIMITS } from '@/lib/rateLimit';
import { getTallySettings, saveTallySettings, testTallyConnection } from '@/lib/tally';

export async function POST(request: Request) {
  const auth = await requireSession(request, ['admin']);
  if ('error' in auth) return auth.error;

  const ip = getClientIP(request);
  const limit = await rateLimiter.check(`api:tally:test-connection:${auth.user.id}:${ip}`, RATE_LIMITS.MODERATE);
  if (limit.isLimited) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${limit.retryAfter} seconds.` },
      { status: 429, headers: { 'Retry-After': limit.retryAfter.toString() } }
    );
  }

  try {
    const body = await request.json();
    const current = await getTallySettings();
    const merged = {
      ...current,
      enabled: typeof body.enabled === 'boolean' ? body.enabled : current.enabled,
      host: body.host ?? current.host,
      port: Number(body.port ?? current.port),
      companyName: body.companyName ?? current.companyName,
      mockMode: typeof body.mockMode === 'boolean' ? body.mockMode : current.mockMode,
    };

    const result = await testTallyConnection(merged);
    await saveTallySettings({ ...merged, lastTestedAt: new Date().toISOString(), syncStatus: result.success ? 'ready' : 'failed' });

    return NextResponse.json({ result });
  } catch (error) {
    console.error('[api/tally/test-connection POST]', error);
    return NextResponse.json({ error: 'Failed to test Tally connection.' }, { status: 500 });
  }
}

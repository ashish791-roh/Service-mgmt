import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getClientIP, rateLimiter, RATE_LIMITS } from '@/lib/rateLimit';
import { getTallyDashboardStats, getTallySettings } from '@/lib/tally';

export async function GET(request: Request) {
  const auth = await requireSession(request, ['admin']);
  if ('error' in auth) return auth.error;

  const ip = getClientIP(request);
  const limit = await rateLimiter.check(`api:tally:stats:${auth.user.id}:${ip}`, RATE_LIMITS.MODERATE);
  if (limit.isLimited) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${limit.retryAfter} seconds.` },
      { status: 429, headers: { 'Retry-After': limit.retryAfter.toString() } }
    );
  }

  try {
    const stats = await getTallyDashboardStats();
    const settings = await getTallySettings();
    return NextResponse.json({ stats, settings });
  } catch (error) {
    console.error('[api/tally/stats GET]', error);
    return NextResponse.json({ error: 'Failed to load Tally dashboard stats.' }, { status: 500 });
  }
}

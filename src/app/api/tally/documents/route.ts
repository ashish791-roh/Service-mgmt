import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getClientIP, rateLimiter, RATE_LIMITS } from '@/lib/rateLimit';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const auth = await requireSession(request, ['admin']);
  if ('error' in auth) return auth.error;

  const ip = getClientIP(request);
  const limit = await rateLimiter.check(`api:tally:documents:${auth.user.id}:${ip}`, RATE_LIMITS.MODERATE);
  if (limit.isLimited) return NextResponse.json({ error: `Too many requests. Try again in ${limit.retryAfter} seconds.` }, { status: 429 });

  try {
    const rows = await prisma.tallyDocument.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    return NextResponse.json({ documents: rows });
  } catch (err) {
    console.error('[api/tally/documents GET]', err);
    return NextResponse.json({ error: 'Failed to load documents.' }, { status: 500 });
  }
}

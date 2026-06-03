import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getClientIP, rateLimiter, RATE_LIMITS } from '@/lib/rateLimit';
import { pushToTally, getTallySettings } from '@/lib/tally';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const auth = await requireSession(request, ['admin']);
  if ('error' in auth) return auth.error;

  const ip = getClientIP(request);
  const limit = await rateLimiter.check(`api:tally:push:${auth.user.id}:${ip}`, RATE_LIMITS.MODERATE);
  if (limit.isLimited) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${limit.retryAfter} seconds.` },
      { status: 429, headers: { 'Retry-After': limit.retryAfter.toString() } }
    );
  }

  try {
    const body = await request.json();
    const documentId = String(body.documentId || '');

    const document = await prisma.tallyDocument.findUnique({ where: { id: documentId } });
    if (!document) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }

    if (!document.xmlPayload) {
      return NextResponse.json({ error: 'XML payload is missing. Generate XML before pushing.' }, { status: 400 });
    }

    const settings = await getTallySettings();
    const result = await pushToTally(document.xmlPayload, settings, { id: auth.user.id, name: auth.user.name, role: auth.user.role }, documentId);

    await prisma.tallyDocument.update({
      where: { id: documentId },
      data: {
        status: result.success ? 'approved' : 'failed',
      },
    });

    return NextResponse.json({ result });
  } catch (error) {
    console.error('[api/tally/push POST]', error);
    return NextResponse.json({ error: 'Failed to push document to Tally.' }, { status: 500 });
  }
}

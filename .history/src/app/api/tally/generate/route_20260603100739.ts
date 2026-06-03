import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getClientIP, rateLimiter, RATE_LIMITS } from '@/lib/rateLimit';
import { buildVoucherXml } from '@/lib/tally';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const auth = await requireSession(request, ['admin']);
  if ('error' in auth) return auth.error;

  const ip = getClientIP(request);
  const limit = await rateLimiter.check(`api:tally:generate:${auth.user.id}:${ip}`, RATE_LIMITS.MODERATE);
  if (limit.isLimited) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${limit.retryAfter} seconds.` },
      { status: 429, headers: { 'Retry-After': limit.retryAfter.toString() } }
    );
  }

  try {
    const body = await request.json();
    const documentId = String(body.documentId || '');
    const voucherType = ['sales', 'purchase', 'receipt', 'payment', 'journal'].includes(body.voucherType)
      ? body.voucherType
      : 'sales';

    const document = await prisma.tallyDocument.findUnique({ where: { id: documentId } });
    if (!document) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }

    const xml = buildVoucherXml(document.extractedData as any, voucherType as any);

    await prisma.tallyDocument.update({
      where: { id: documentId },
      data: { xmlPayload: xml, voucherType, status: 'approved' },
    });

    return NextResponse.json({ xml, documentId });
  } catch (error) {
    console.error('[api/tally/generate POST]', error);
    return NextResponse.json({ error: 'Failed to generate Tally XML.' }, { status: 500 });
  }
}

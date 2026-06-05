import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getClientIP, rateLimiter, RATE_LIMITS } from '@/lib/rateLimit';
import { pushToTally, getTallySettings, scheduleRetryForFailedPush } from '@/lib/tally';
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
    const force = !!body.force;

    const document = await prisma.tallyDocument.findUnique({ where: { id: documentId } });
    if (!document) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }

    const extracted = document.extractedData;
    const invoiceNumber = (extracted as any)?.invoiceNumber;
    const invoiceDate = (extracted as any)?.invoiceDate;

    if (invoiceNumber && invoiceDate && !force) {
      const duplicate = await prisma.tallyDocument.findFirst({
        where: {
          status: 'pushed',
          id: { not: document.id },
          AND: [
            {
              extractedData: {
                path: ['invoiceNumber'],
                equals: invoiceNumber,
              },
            },
            {
              extractedData: {
                path: ['invoiceDate'],
                equals: invoiceDate,
              },
            },
          ],
        },
      });

      if (duplicate) {
        return NextResponse.json({
          error: 'duplicate',
          message: `Warning: A document with the same invoice number (${invoiceNumber}) and date (${invoiceDate}) has already been pushed to Tally.`,
        }, { status: 409 });
      }
    }

    if (!document.xmlPayload) {
      return NextResponse.json({ error: 'XML payload is missing. Generate XML before pushing.' }, { status: 400 });
    }

    const settings = await getTallySettings();
    const result = await pushToTally(document.xmlPayload, settings, { id: auth.user.id, name: auth.user.name, role: auth.user.role }, documentId);

    if (result.success) {
      await prisma.tallyDocument.update({
        where: { id: documentId },
        data: {
          status: 'pushed',
          tallyResponse: result.response ?? 'SUCCESS',
          retryCount: 0,
          nextRetryAt: null,
        },
      });
    } else {
      await scheduleRetryForFailedPush(documentId, document.retryCount);
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('[api/tally/push POST]', error);
    return NextResponse.json({ error: 'Failed to push document to Tally.' }, { status: 500 });
  }
}

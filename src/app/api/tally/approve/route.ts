import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getClientIP, rateLimiter, RATE_LIMITS } from '@/lib/rateLimit';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/auditLog';
import { getTallySettings, buildVoucherXml, pushToTally, scheduleRetryForFailedPush } from '@/lib/tally';

export async function POST(request: Request) {
  const auth = await requireSession(request, ['admin']);
  if ('error' in auth) return auth.error;

  const ip = getClientIP(request);
  const limit = await rateLimiter.check(`api:tally:approve:${auth.user.id}:${ip}`, RATE_LIMITS.STRICT);
  if (limit.isLimited) return NextResponse.json({ error: `Too many requests. Try again in ${limit.retryAfter} seconds.` }, { status: 429 });

  try {
    const body = await request.json();
    const { documentId, action, extractedData, force } = body;
    if (!documentId || !['approve', 'reject'].includes(action)) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

    let doc = await prisma.tallyDocument.findUnique({ where: { id: String(documentId) } });
    if (!doc) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });

    const extracted = extractedData || doc.extractedData;
    const invoiceNumber = (extracted as any)?.invoiceNumber;
    const invoiceDate = (extracted as any)?.invoiceDate;

    if (action === 'approve' && invoiceNumber && invoiceDate && !force) {
      const duplicate = await prisma.tallyDocument.findFirst({
        where: {
          status: 'pushed',
          id: { not: doc.id },
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

    let newStatus = action === 'approve' ? 'approved' : 'rejected';

    if (action === 'approve' && extractedData) {
      doc = await prisma.tallyDocument.update({
        where: { id: String(documentId) },
        data: {
          extractedData: extractedData as any,
          confidence: typeof extractedData.confidence === 'number' ? extractedData.confidence : doc.confidence,
        },
      });
    }

    // Update status immediately to reflect reviewer action
    await prisma.tallyDocument.update({ where: { id: String(documentId) }, data: { status: newStatus } });

    await writeAuditLog({
      actor: { id: auth.user.id, name: auth.user.name, role: auth.user.role },
      action: action === 'approve' ? 'approve' : 'reject',
      entity: 'tallyDocument',
      entityId: String(documentId),
      newValue: { status: newStatus },
    });

    // If approved, optionally build voucher XML and push to Tally immediately (respects autoPushOnApproval setting)
    if (action === 'approve') {
      try {
        const settings = await getTallySettings();
        
        // Only auto-push if enabled in settings
        if (settings.autoPushOnApproval) {
          const actor = { id: auth.user.id, name: auth.user.name, role: auth.user.role };

          // Build XML from extracted data
          const xml = buildVoucherXml(doc.extractedData as any, doc.voucherType as any);

          // Persist xmlPayload for traceability
          await prisma.tallyDocument.update({ where: { id: String(documentId) }, data: { xmlPayload: xml } });

          // Push to Tally (pushToTally respects settings.mockMode)
          const pushResult = await pushToTally(xml, settings, actor, String(documentId));

          if (pushResult.success) {
            await prisma.tallyDocument.update({
              where: { id: String(documentId) },
              data: {
                tallyResponse: pushResult.response ?? 'SUCCESS',
                status: 'pushed',
                retryCount: 0,
                nextRetryAt: null,
              },
            });
            newStatus = 'pushed';
          } else {
            await scheduleRetryForFailedPush(String(documentId), 0);
            newStatus = 'failed';
          }
        }
      } catch (pushErr) {
        console.error('[api/tally/approve push]', pushErr);
        await scheduleRetryForFailedPush(String(documentId), 0);
        newStatus = 'failed';
      }
    }

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (err) {
    console.error('[api/tally/approve POST]', err);
    return NextResponse.json({ error: 'Failed to update document.' }, { status: 500 });
  }
}

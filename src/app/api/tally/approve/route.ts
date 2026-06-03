import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getClientIP, rateLimiter, RATE_LIMITS } from '@/lib/rateLimit';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/auditLog';
import { getTallySettings, buildVoucherXml, pushToTally } from '@/lib/tally';

export async function POST(request: Request) {
  const auth = await requireSession(request, ['admin']);
  if ('error' in auth) return auth.error;

  const ip = getClientIP(request);
  const limit = await rateLimiter.check(`api:tally:approve:${auth.user.id}:${ip}`, RATE_LIMITS.STRICT);
  if (limit.isLimited) return NextResponse.json({ error: `Too many requests. Try again in ${limit.retryAfter} seconds.` }, { status: 429 });

  try {
    const body = await request.json();
    const { documentId, action } = body;
    if (!documentId || !['approve', 'reject'].includes(action)) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

    const doc = await prisma.tallyDocument.findUnique({ where: { id: String(documentId) } });
    if (!doc) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });

    let newStatus = action === 'approve' ? 'approved' : 'rejected';

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

          // Record response and status
          await prisma.tallyDocument.update({ where: { id: String(documentId) }, data: { tallyResponse: pushResult.response ?? (pushResult.message ?? ''), status: pushResult.success ? 'pushed' : 'failed' } });

          newStatus = pushResult.success ? 'pushed' : 'failed';
        }
      } catch (pushErr) {
        console.error('[api/tally/approve push]', pushErr);
        await prisma.tallyDocument.update({ where: { id: String(documentId) }, data: { status: 'failed', tallyResponse: pushErr instanceof Error ? pushErr.message : String(pushErr) } });
        newStatus = 'failed';
      }
    }

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (err) {
    console.error('[api/tally/approve POST]', err);
    return NextResponse.json({ error: 'Failed to update document.' }, { status: 500 });
  }
}

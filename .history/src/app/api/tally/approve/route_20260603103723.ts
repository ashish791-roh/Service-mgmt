import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getClientIP, rateLimiter, RATE_LIMITS } from '@/lib/rateLimit';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/auditLog';

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

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    await prisma.tallyDocument.update({ where: { id: String(documentId) }, data: { status: newStatus } });

    await writeAuditLog({
      actor: { id: auth.user.id, name: auth.user.name, role: auth.user.role },
      action: action === 'approve' ? 'approve' : 'reject',
      entity: 'tallyDocument',
      entityId: String(documentId),
      newValue: { status: newStatus },
    });

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (err) {
    console.error('[api/tally/approve POST]', err);
    return NextResponse.json({ error: 'Failed to update document.' }, { status: 500 });
  }
}

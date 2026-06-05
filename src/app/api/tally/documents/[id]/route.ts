import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getClientIP, rateLimiter, RATE_LIMITS } from '@/lib/rateLimit';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/auditLog';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(request, ['admin']);
  if ('error' in auth) return auth.error;

  const ip = getClientIP(request);
  const limit = await rateLimiter.check(`api:tally:document:delete:${auth.user.id}:${ip}`, RATE_LIMITS.STRICT);
  if (limit.isLimited) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${limit.retryAfter} seconds.` },
      { status: 429 }
    );
  }

  try {
    const { id } = await params;
    const doc = await prisma.tallyDocument.findUnique({ where: { id } });
    if (!doc) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }

    await prisma.tallyDocument.delete({ where: { id } });

    await writeAuditLog({
      actor: { id: auth.user.id, name: auth.user.name, role: auth.user.role },
      action: 'delete',
      entity: 'tallyDocument',
      entityId: id,
      oldValue: { fileName: doc.fileName, status: doc.status },
      newValue: null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/tally/documents/[id] DELETE]', err);
    return NextResponse.json({ error: 'Failed to delete document.' }, { status: 500 });
  }
}

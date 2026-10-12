import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { verifyToken } from '@/lib/totp';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/auditLog';

export async function POST(request: Request) {
  const auth = await requireSession(['admin', 'super_admin']);
  if ('error' in auth) return auth.error;

  try {
    const { user } = auth;
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { secret, code } = body;
    if (!secret || !code || typeof secret !== 'string' || typeof code !== 'string') {
      return NextResponse.json({ error: 'Secret and verification code are required.' }, { status: 400 });
    }

    const isValid = verifyToken(secret, code);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid verification code. Please check your authenticator app.' }, { status: 400 });
    }

    // Save MFA settings to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaSecret: secret,
        mfaEnabled: true,
      },
    });

    await createAuditLog('MFA_ENABLED', user.id, { timestamp: new Date().toISOString() });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[POST /api/auth/mfa/enable]', error);
    return NextResponse.json({ error: 'Failed to enable MFA.' }, { status: 500 });
  }
}

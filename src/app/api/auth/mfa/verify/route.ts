import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, verifyTempMfaToken } from '@/lib/totp';
import {
  createSession,
  sessionCookieOptions,
  csrfCookieOptions,
} from '@/lib/auth';
import { getClientIP } from '@/lib/rateLimit';
import { createAuditLog } from '@/lib/auditLog';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { tempToken, code } = body;
    if (!tempToken || !code || typeof tempToken !== 'string' || typeof code !== 'string') {
      return NextResponse.json({ error: 'Temporary token and MFA code are required.' }, { status: 400 });
    }

    const userId = verifyTempMfaToken(tempToken);
    if (!userId) {
      return NextResponse.json({ error: 'Temporary login session expired or invalid. Please login again.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive || !user.mfaEnabled || !user.mfaSecret) {
      return NextResponse.json({ error: 'MFA is not enabled or user not found.' }, { status: 400 });
    }

    const isValid = verifyToken(user.mfaSecret, code);
    if (!isValid) {
      await createAuditLog('MFA_FAILURE', user.id, { timestamp: new Date().toISOString() });
      return NextResponse.json({ error: 'Invalid verification code. Please check your authenticator app.' }, { status: 400 });
    }

    // Reset attempts on successful MFA completion
    await prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null },
    });

    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') ?? '';

    // Create full authenticated session
    const sessionUser = {
      id:       user.id,
      email:    user.email,
      name:     user.name,
      role:     user.role as 'admin' | 'reception' | 'engineer' | 'super_admin',
      isActive: user.isActive,
      branchId: user.branchId,
    };
    const { token, csrfToken } = await createSession(sessionUser, userAgent, clientIP);

    await createAuditLog('LOGIN_SUCCESS', user.id, { ip: clientIP, userAgent, timestamp: new Date().toISOString(), mfa: true });

    const { password: _, mfaSecret: __, ...safeUser } = user;
    const response = NextResponse.json({
      user: {
        ...safeUser,
        active:   safeUser.isActive,
        joinedAt: safeUser.createdAt.toISOString().slice(0, 10),
      },
    });

    response.cookies.set(sessionCookieOptions(token));
    response.cookies.set(csrfCookieOptions(csrfToken));

    return response;
  } catch (error) {
    console.error('[POST /api/auth/mfa/verify]', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

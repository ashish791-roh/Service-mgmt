import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getSession, maybeRotateSession } from '@/lib/auth';
import { getClientIP } from '@/lib/rateLimit';

export async function POST(request: Request) {
  try {
    const userAgent = request.headers.get('user-agent') ?? '';
    const clientIP = getClientIP(request);

    // Parse session token from cookies
    const cookieHeader = request.headers.get('cookie') ?? '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const parts = c.trim().split('=');
        return [parts[0], parts.slice(1).join('=')];
      })
    );
    const token = cookies['fixhub_session'];

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const sessionData = await getSession(token, clientIP);
    if (!sessionData) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Token binding verification
    const incomingUaHash = crypto.createHash('sha256').update(userAgent).digest('hex');
    if (sessionData.uaHash && sessionData.uaHash !== incomingUaHash) {
      // Destroy session on mismatch
      await prisma.session.deleteMany({ where: { token } }).catch(() => {});
      return NextResponse.json({ authenticated: false, error: 'Session device mismatch.' }, { status: 401 });
    }

    const { csrfToken: storedCsrf, uaHash, ip, ...user } = sessionData;

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    user.role = dbUser.role as any;
    user.branchId = dbUser.branchId || 'default';
    user.isActive = dbUser.isActive;

    if (!user.isActive) {
      return NextResponse.json({ authenticated: false, error: 'Account is disabled.' }, { status: 403 });
    }

    // Check if rotation is due
    const rotated = await maybeRotateSession(token, { ...user, csrfToken: storedCsrf });

    return NextResponse.json({
      authenticated: true,
      user,
      csrfToken: rotated ? rotated.csrfToken : storedCsrf,
      rotated: rotated || null,
    });
  } catch (error) {
    console.error('[POST /api/auth/session-check]', error);
    return NextResponse.json({ authenticated: false, error: 'Internal validation error.' }, { status: 500 });
  }
}

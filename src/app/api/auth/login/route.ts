import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import {
  createSession,
  destroySession,
  sessionCookieOptions,
  csrfCookieOptions,
  clearCookieOptions,
  clearCsrfCookieOptions,
  COOKIE_NAME,
} from '@/lib/auth';
import { rateLimiter, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';
import { createAuditLog } from '@/lib/auditLog';

export async function POST(request: Request) {
  const startTime = performance.now();
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') ?? '';

  try {
    const body = await request.json().catch(() => null);
    
    // 5. INPUT VALIDATION
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { email, password } = body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Email and password are required strings.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 });
    }

    if (password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: 'Password must be between 8 and 128 characters.' }, { status: 400 });
    }

    const emailLowercase = email.trim().toLowerCase();

    // Rate limit — per IP
    const ipLimit = await rateLimiter.check(`login:ip:${clientIP}`, RATE_LIMITS.LOGIN);
    if (ipLimit.isLimited) {
      const elapsed = performance.now() - startTime;
      await new Promise(resolve => setTimeout(resolve, Math.max(0, 300 - elapsed)));
      return NextResponse.json(
        { error: `Too many login attempts from this IP. Try again in ${ipLimit.retryAfter} seconds.` },
        { status: 429, headers: { 'Retry-After': ipLimit.retryAfter.toString() } }
      );
    }

    // Lockout check at the start
    const user = await prisma.user.findUnique({
      where: { email: emailLowercase },
    });

    if (user && user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remainingSeconds = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 1000);
      const elapsed = performance.now() - startTime;
      await new Promise(resolve => setTimeout(resolve, Math.max(0, 300 - elapsed)));
      return NextResponse.json(
        { error: `Account temporarily locked due to too many failed attempts. Try again in ${remainingSeconds} seconds.` },
        { status: 429 }
      );
    }

    // Always run bcrypt to prevent timing-based email enumeration
    const passwordMatch = user
      ? await bcrypt.compare(password, user.password)
      : await bcrypt.compare(password, '$2a$10$invalidhashpadding000000000000000000000000000000000000');

    if (!user || !user.isActive || !passwordMatch) {
      // Brute force failed login counter
      if (user) {
        const attempts = user.failedAttempts + 1;
        const updateData: any = { failedAttempts: attempts };
        if (attempts >= 5) {
          updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        }
        await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
      }

      await createAuditLog('LOGIN_FAILURE', user?.id ?? 'unknown', { ip: clientIP, userAgent, timestamp: new Date().toISOString() });

      const elapsed = performance.now() - startTime;
      await new Promise(resolve => setTimeout(resolve, Math.max(0, 300 - elapsed)));
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Reset attempts on successful login
    await prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null },
    });

    // Create session (UA and IP binding)
    const sessionUser = {
      id:       user.id,
      email:    user.email,
      name:     user.name,
      role:     user.role as 'admin' | 'reception' | 'engineer' | 'super_admin',
      isActive: user.isActive,
      branchId: user.branchId,
    };
    const { token, csrfToken } = await createSession(sessionUser, userAgent, clientIP);

    await createAuditLog('LOGIN_SUCCESS', user.id, { ip: clientIP, userAgent, timestamp: new Date().toISOString() });

    const { password: _, ...safeUser } = user;
    const response = NextResponse.json({
      user: {
        ...safeUser,
        active:   safeUser.isActive,
        joinedAt: safeUser.createdAt.toISOString().slice(0, 10),
      },
    });

    response.cookies.set(sessionCookieOptions(token));
    response.cookies.set(csrfCookieOptions(csrfToken));

    const elapsed = performance.now() - startTime;
    await new Promise(resolve => setTimeout(resolve, Math.max(0, 300 - elapsed)));
    return response;
  } catch (error) {
    console.error('[auth/login]', error);
    const elapsed = performance.now() - startTime;
    await new Promise(resolve => setTimeout(resolve, Math.max(0, 300 - elapsed)));
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const token       = cookieStore.get(COOKIE_NAME)?.value;
    if (token) await destroySession(token);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(clearCookieOptions());
    response.cookies.set(clearCsrfCookieOptions());
    return response;
  } catch (error) {
    console.error('[auth/logout]', error);
    return NextResponse.json({ error: 'Logout failed.' }, { status: 500 });
  }
}
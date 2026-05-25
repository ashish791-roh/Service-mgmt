import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import {
  createSession,
  destroySession,
  sessionCookieOptions,
  clearCookieOptions,
  COOKIE_NAME,
  LIMITS,
  checkLengths,
} from '@/lib/auth';
import { rateLimiter, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';

// ── POST /api/auth/login ─────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    // ── Rate limiting ─────────────────────────────────────────────
    const clientIP = getClientIP(request);
    const emailLowercase = (email as string).trim().toLowerCase();

    // Check IP-based rate limit (5 attempts per 15 minutes per IP)
    const ipLimitKey = `login:ip:${clientIP}`;
    const ipLimit = await rateLimiter.check(ipLimitKey, RATE_LIMITS.LOGIN);

    if (ipLimit.isLimited) {
      return NextResponse.json(
        {
          error: `Too many login attempts from this IP. Try again in ${ipLimit.retryAfter} seconds.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': ipLimit.retryAfter.toString(),
          },
        }
      );
    }

    // Check email-based rate limit (5 attempts per 15 minutes per email)
    const emailLimitKey = `login:email:${emailLowercase}`;
    const emailLimit = await rateLimiter.check(emailLimitKey, RATE_LIMITS.LOGIN);

    if (emailLimit.isLimited) {
      return NextResponse.json(
        {
          error: `Too many login attempts for this email. Try again in ${emailLimit.retryAfter} seconds.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': emailLimit.retryAfter.toString(),
          },
        }
      );
    }

    // Input length caps
    const lengthError = checkLengths([
      [email, 'email', LIMITS.email],
      [password, 'password', LIMITS.password],
    ]);
    if (lengthError) {
      return NextResponse.json({ error: lengthError }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: emailLowercase },
    });

    // Always run bcrypt compare to prevent timing-based email enumeration
    const passwordMatch = user
      ? await bcrypt.compare(password, user.password)
      : await bcrypt.compare(password, '$2a$10$invalidhashpadding000000000000000000000000000000000000');

    if (!user || !user.isActive || !passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Create server-side session
    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'admin' | 'reception' | 'engineer',
      isActive: user.isActive,
    };
    const token = await createSession(sessionUser);

    // Strip password before sending to client
    const { password: _, ...safeUser } = user;

    const response = NextResponse.json({
      user: {
        ...safeUser,
        active: safeUser.isActive,
        joinedAt: safeUser.createdAt.toISOString().slice(0, 10),
      },
    });

    // Set HttpOnly session cookie — JS cannot read this
    response.cookies.set(sessionCookieOptions(token));

    return response;
  } catch (error) {
    console.error('[auth/login]', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}

// ── DELETE /api/auth/login  (logout) ─────────────────────

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (token) await destroySession(token);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(clearCookieOptions());
    return response;
  } catch (error) {
    console.error('[auth/logout]', error);
    return NextResponse.json({ error: 'Logout failed.' }, { status: 500 });
  }
}
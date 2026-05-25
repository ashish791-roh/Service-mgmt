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
  LIMITS,
  checkLengths,
} from '@/lib/auth';
import { rateLimiter, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';

// ── Account lockout constants ─────────────────────────────────────────────────
// After MAX_FAILED_ATTEMPTS consecutive failures the account is soft-locked
// for LOCKOUT_WINDOW_MS even if the password is later correct. This is stored
// purely in the rate-limiter store (no schema change required).
const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_CONFIG = { maxRequests: MAX_FAILED_ATTEMPTS, windowMs: 30 * 60 * 1_000 }; // 30 min

// ── POST /api/auth/login ──────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    // ── Input length caps (early, before DB hit) ──────────────────────────────
    const lengthError = checkLengths([
      [email,    'email',    LIMITS.email],
      [password, 'password', LIMITS.password],
    ]);
    if (lengthError) {
      return NextResponse.json({ error: lengthError }, { status: 400 });
    }

    const clientIP       = getClientIP(request);
    const emailLowercase = (email as string).trim().toLowerCase();

    // ── Rate limit — per IP ───────────────────────────────────────────────────
    const ipLimit = await rateLimiter.check(`login:ip:${clientIP}`, RATE_LIMITS.LOGIN);
    if (ipLimit.isLimited) {
      return NextResponse.json(
        { error: `Too many login attempts from this IP. Try again in ${ipLimit.retryAfter} seconds.` },
        { status: 429, headers: { 'Retry-After': ipLimit.retryAfter.toString() } }
      );
    }

    // ── Rate limit — per email (account lockout) ──────────────────────────────
    const emailLimitKey  = `login:email:${emailLowercase}`;
    const emailLimit     = await rateLimiter.check(emailLimitKey, LOCKOUT_CONFIG);
    if (emailLimit.isLimited) {
      return NextResponse.json(
        { error: `Account temporarily locked due to too many failed attempts. Try again in ${emailLimit.retryAfter} seconds.` },
        { status: 429, headers: { 'Retry-After': emailLimit.retryAfter.toString() } }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: emailLowercase },
    });

    // Always run bcrypt to prevent timing-based email enumeration
    const passwordMatch = user
      ? await bcrypt.compare(password, user.password)
      : await bcrypt.compare(password, '$2a$10$invalidhashpadding000000000000000000000000000000000000');

    if (!user || !user.isActive || !passwordMatch) {
      // Do NOT reset on failure — let the lockout counter accumulate
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // ── Login success — reset per-email lockout counter ───────────────────────
    await rateLimiter.reset(emailLimitKey);

    // ── Create server-side session + CSRF token ───────────────────────────────
    const sessionUser = {
      id:       user.id,
      email:    user.email,
      name:     user.name,
      role:     user.role as 'admin' | 'reception' | 'engineer',
      isActive: user.isActive,
    };
    const { token, csrfToken } = await createSession(sessionUser);

    const { password: _, ...safeUser } = user;

    const response = NextResponse.json({
      user: {
        ...safeUser,
        active:   safeUser.isActive,
        joinedAt: safeUser.createdAt.toISOString().slice(0, 10),
      },
    });

    // Session cookie — HttpOnly, JS cannot read
    response.cookies.set(sessionCookieOptions(token));
    // CSRF cookie — readable by JS so the client can echo it in the header
    response.cookies.set(csrfCookieOptions(csrfToken));

    return response;
  } catch (error) {
    console.error('[auth/login]', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// ── DELETE /api/auth/login  (logout) ─────────────────────────────────────────

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
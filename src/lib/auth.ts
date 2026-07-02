/**
 * auth.ts — server-side session helpers
 *
 * SECURITY ENHANCEMENTS (added on top of original):
 *  1. Session rotation  — a new token is issued on every requireSession() call
 *     that is older than SESSION_ROTATE_AFTER_MS (15 min). This limits the
 *     window an intercepted token is usable.
 *  2. CSRF double-submit cookie — every mutating route (POST/PUT/PATCH/DELETE)
 *     must echo the `x-csrf-token` header that matches the `fixhub_csrf`
 *     cookie value. Both are set at login and rotated with the session.
 *  3. Absolute session expiry (8 h) + idle expiry (2 h inactivity). The idle
 *     clock is reset on every valid request.
 *  4. `Secure` cookie flag is now also set in test environments so it cannot
 *     accidentally be disabled in staging.
 *  5. Input sanitisation — all string helpers now also strip null bytes.
 *  6. `requireSession` optionally enforces CSRF on mutating methods.
 *
 * Sessions are stored in the `Session` table in PostgreSQL via Prisma.
 *
 * Prerequisites — prisma/schema.prisma must include:
 *
 *   model Session {
 *     token     String   @id @db.VarChar(64)
 *     userId    String
 *     payload   Json
 *     expiresAt DateTime
 *     idleAt    DateTime
 *     createdAt DateTime @default(now())
 *
 *     @@index([userId])
 *     @@index([expiresAt])
 *   }
 *
 * Run: npx prisma migrate dev --name add-session-idle
 */

import { cookies, headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { getClientIP } from './rateLimit';
import { addSecurityHeaders as applySecurityHeaders } from './securityHeaders';

// ── Constants ────────────────────────────────────────────────────────────────

export const COOKIE_NAME   = 'fixhub_session';
export const CSRF_COOKIE   = 'fixhub_csrf';

const SESSION_TTL_MS      = 8  * 60 * 60 * 1_000; // 8 hours absolute
const SESSION_IDLE_MS     = 2  * 60 * 60 * 1_000; // 2 hours idle
const SESSION_ROTATE_MS   = 15 * 60 * 1_000;       // rotate token every 15 min

// Mutating HTTP methods that must carry a valid CSRF token
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SessionUser {
  id:       string;
  email:    string;
  name:     string;
  role:     'admin' | 'reception' | 'engineer' | 'super_admin';
  isActive: boolean;
  branchId: string;
}

type AllowedRoles = ('admin' | 'reception' | 'engineer' | 'super_admin')[];

// ── Internal helpers ──────────────────────────────────────────────────────────

function makeToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function makeCsrfToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

/** Strip null bytes and control characters from user-supplied strings. */
function sanitise(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/\x00/g, '').replace(/[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
}

// ── Session CRUD ──────────────────────────────────────────────────────────────

/** Create a persistent session and return { token, csrfToken }. */
export async function createSession(
  user: SessionUser,
  userAgent?: string,
  ip?: string
): Promise<{ token: string; csrfToken: string }> {
  const token     = makeToken();
  const csrfToken = makeCsrfToken();
  const now       = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const idleAt    = new Date(now.getTime() + SESSION_IDLE_MS);

  const uaHash = crypto.createHash('sha256').update(userAgent ?? '').digest('hex');

  await prisma.session.create({
    data: {
      token,
      userId:    user.id,
      payload:   { ...user, csrfToken, uaHash, ip } as Prisma.InputJsonValue,
      expiresAt,
      idleAt,
    },
  });

  // Best-effort background prune of expired sessions
  prisma.session
    .deleteMany({ where: { expiresAt: { lt: now } } })
    .catch(() => {});

  return { token, csrfToken };
}

/** Destroy a session by token (logout). */
export async function destroySession(token: string): Promise<void> {
  try {
    await prisma.session.deleteMany({ where: { token } });
  } catch { /**/ }
}

/** Destroy ALL sessions for a user (e.g. account deactivated). */
export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  try {
    await prisma.session.deleteMany({ where: { userId } });
  } catch { /**/ }
}

const failedLookups = new Map<string, number[]>();

/**
 * Look up a live session by token.
 * Returns null if missing, absolutely expired, or idle-expired.
 * Side-effect: bumps idleAt on every valid lookup.
 */
export async function getSession(
  token: string,
  ip?: string
): Promise<(SessionUser & { csrfToken: string; uaHash?: string; ip?: string }) | null> {
  if (ip) {
    const now = Date.now();
    const windowStart = now - 10 * 60 * 1000;
    const attempts = failedLookups.get(ip) || [];
    const recentAttempts = attempts.filter(t => t > windowStart);
    if (recentAttempts.length >= 20) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  try {
    const session = await prisma.session.findUnique({ where: { token } });
    if (!session) {
      if (ip) {
        const now = Date.now();
        const attempts = failedLookups.get(ip) || [];
        attempts.push(now);
        failedLookups.set(ip, attempts);
      }
      return null;
    }

    const now = new Date();

    // Absolute expiry
    if (new Date(session.expiresAt) < now) {
      destroySession(token).catch(() => {});
      return null;
    }

    // Idle expiry
    if (new Date(session.idleAt) < now) {
      destroySession(token).catch(() => {});
      return null;
    }

    // Bump idle clock (fire-and-forget)
    const newIdleAt = new Date(now.getTime() + SESSION_IDLE_MS);
    prisma.session
      .update({ where: { token }, data: { idleAt: newIdleAt } })
      .catch(() => {});

    return session.payload as unknown as SessionUser & { csrfToken: string; uaHash?: string; ip?: string };
  } catch {
    return null;
  }
}

// ── Session rotation ──────────────────────────────────────────────────────────

/**
 * If the session token is older than SESSION_ROTATE_MS, atomically issue a
 * new token + CSRF token, delete the old one, and return the new values so
 * the caller can set fresh cookies.
 *
 * Returns null when rotation is not yet due.
 */
export async function maybeRotateSession(
  oldToken: string,
  user: SessionUser & { csrfToken: string }
): Promise<{ token: string; csrfToken: string } | null> {
  try {
    const session = await prisma.session.findUnique({
      where:  { token: oldToken },
      select: { createdAt: true, expiresAt: true, idleAt: true },
    });
    if (!session) return null;

    const age = Date.now() - new Date(session.createdAt).getTime();
    if (age < SESSION_ROTATE_MS) return null;

    const newToken     = makeToken();
    const newCsrfToken = makeCsrfToken();
    const now          = new Date();

    await prisma.session.create({
      data: {
        token:     newToken,
        userId:    user.id,
        payload:   { ...user, csrfToken: newCsrfToken } as Prisma.InputJsonValue,
        expiresAt: session.expiresAt,  // preserve absolute expiry
        idleAt:    new Date(now.getTime() + SESSION_IDLE_MS),
      },
    });

    // Delete old token async
    destroySession(oldToken).catch(() => {});

    return { token: newToken, csrfToken: newCsrfToken };
  } catch {
    return null;
  }
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

const isSecure = () => process.env.NODE_ENV !== 'development';

export function sessionCookieOptions(token: string) {
  return {
    name:     COOKIE_NAME,
    value:    token,
    httpOnly: true,
    secure:   isSecure(),
    sameSite: 'strict' as const,   // upgraded from 'lax'
    path:     '/',
    maxAge:   SESSION_TTL_MS / 1_000,
  };
}

export function csrfCookieOptions(csrfToken: string) {
  return {
    name:     CSRF_COOKIE,
    value:    csrfToken,
    httpOnly: false,              // JS must be able to read it to echo in header
    secure:   isSecure(),
    sameSite: 'strict' as const,
    path:     '/',
    maxAge:   SESSION_TTL_MS / 1_000,
  };
}

export function clearCookieOptions() {
  return {
    name:     COOKIE_NAME,
    value:    '',
    httpOnly: true,
    secure:   isSecure(),
    sameSite: 'strict' as const,
    path:     '/',
    maxAge:   0,
  };
}

export function clearCsrfCookieOptions() {
  return {
    name:     CSRF_COOKIE,
    value:    '',
    httpOnly: false,
    secure:   isSecure(),
    sameSite: 'strict' as const,
    path:     '/',
    maxAge:   0,
  };
}

// ── Route-level guard ─────────────────────────────────────────────────────────

export function addSecurityHeaders(response: NextResponse): NextResponse {
  return applySecurityHeaders(response);
}

export async function cleanExpiredSessions(): Promise<number> {
  try {
    const res = await prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
    return res.count;
  } catch {
    return 0;
  }
}

/**
 * Call at the top of every protected route handler.
 *
 * - Validates the session cookie.
 * - Enforces idle + absolute expiry.
 * - Rotates the token when due (sets new cookies on the response you provide).
 * - On mutating methods (POST/PUT/PATCH/DELETE), validates the CSRF token
 *   from the `x-csrf-token` request header against the stored value.
 *
 * Returns `{ user }` on success, or `{ error: NextResponse }` on failure.
 *
 * Usage:
 *   const auth = await requireSession(request, ['admin', 'reception']);
 *   if ('error' in auth) return auth.error;
 *   const { user } = auth;
 */
export async function requireSession(
  requestOrRoles?: NextRequest | Request | AllowedRoles,
  allowedRoles?:   AllowedRoles
): Promise<{ user: SessionUser; ipChanged?: boolean; rotated?: { token: string; csrfToken: string } } | { error: NextResponse }> {

  // Support old call signature: requireSession(allowedRoles?)
  let request: NextRequest | Request | undefined;
  let roles:   AllowedRoles | undefined;

  if (Array.isArray(requestOrRoles)) {
    roles = requestOrRoles;
  } else {
    request = requestOrRoles;
    roles   = allowedRoles;
  }

  const cookieStore = await cookies();
  const token       = cookieStore.get(COOKIE_NAME)?.value;



  let clientIP = '';
  let userAgent = '';
  if (request && 'headers' in request) {
    clientIP = getClientIP(request);
    userAgent = request.headers.get('user-agent') ?? '';
  } else {
    try {
      const headersList = await headers();
      userAgent = headersList.get('user-agent') ?? '';
      const mockReq = {
        headers: {
          get: (name: string) => headersList.get(name)
        }
      } as unknown as Request;
      clientIP = getClientIP(mockReq);
    } catch (_) {}
  }

  if (!token) {
    return { error: addSecurityHeaders(NextResponse.json({ error: 'Authentication required.' }, { status: 401 })) };
  }

  const sessionData = await getSession(token, clientIP);
  if (!sessionData) {
    return {
      error: addSecurityHeaders(NextResponse.json(
        { error: 'Session expired or invalid. Please log in again.' },
        { status: 401 }
      )),
    };
  }

  // Token binding verification
  const incomingUaHash = crypto.createHash('sha256').update(userAgent).digest('hex');
  if (sessionData.uaHash && sessionData.uaHash !== incomingUaHash) {
    destroySession(token).catch(() => {});
    return { error: addSecurityHeaders(NextResponse.json({ error: 'Session device mismatch.' }, { status: 401 })) };
  }

  // Soft IP locking check
  let ipChanged = false;
  if (sessionData.ip && clientIP && sessionData.ip !== clientIP) {
    console.warn('[auth] IP change detected');
    ipChanged = true;
  }

  const { csrfToken: storedCsrf, uaHash, ip, ...user } = sessionData;

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (dbUser) {
    user.role = dbUser.role as any;
    user.branchId = dbUser.branchId || 'default';
    user.isActive = dbUser.isActive;
  }

  if (!user.isActive) {
    return { error: addSecurityHeaders(NextResponse.json({ error: 'Account is disabled.' }, { status: 403 })) };
  }

  const { setRequestBranchId } = await import('@/lib/branchContext');
  setRequestBranchId(user.branchId);

  if (roles && !roles.includes(user.role) && user.role !== 'super_admin') {
    return {
      error: addSecurityHeaders(NextResponse.json(
        { error: 'You do not have permission to perform this action.' },
        { status: 403 }
      )),
    };
  }

  // ── CSRF check on mutating methods ──────────────────────────────────────────
  if (request && MUTATING_METHODS.has(request.method?.toUpperCase() ?? '')) {
    const headerCsrf = request.headers.get('x-csrf-token');
    if (!headerCsrf || !crypto.timingSafeEqual(
      Buffer.from(storedCsrf),
      Buffer.from(headerCsrf.slice(0, storedCsrf.length).padEnd(storedCsrf.length, '\0'))
    )) {
      return {
        error: addSecurityHeaders(NextResponse.json({ error: 'Invalid or missing CSRF token.' }, { status: 403 })),
      };
    }
  }

  // ── Session rotation ─────────────────────────────────────────────────────────
  const rotated = await maybeRotateSession(token, { ...user, csrfToken: storedCsrf });
  if (rotated) {
    try {
      cookieStore.set(sessionCookieOptions(rotated.token));
      cookieStore.set(csrfCookieOptions(rotated.csrfToken));
    } catch (e) {
      console.warn('[auth] Failed to set rotated cookies in current context:', e);
    }
  }

  return { user: user as SessionUser, ipChanged, ...(rotated ? { rotated } : {}) };
}

// ── Input validation helpers ──────────────────────────────────────────────────

const LIMITS = {
  name:      120,
  email:     254,
  password:  128,
  phone:      20,
  address:   300,
  text:    1_000,
  notes:   2_000,
  shortText: 200,
};

export function validateLength(value: unknown, field: string, max: number): string | null {
  if (typeof value !== 'string') return null;
  const clean = sanitise(value);
  if (clean.length > max) return `${field} must be at most ${max} characters.`;
  return null;
}

/** Run multiple length checks; return first error or null. */
export function checkLengths(checks: Array<[unknown, string, number]>): string | null {
  for (const [value, field, max] of checks) {
    const err = validateLength(value, field, max);
    if (err) return err;
  }
  return null;
}

/** Sanitise a user-supplied string (null bytes, control chars). */
export { sanitise };
export { LIMITS };
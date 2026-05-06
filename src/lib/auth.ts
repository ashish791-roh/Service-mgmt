/**
 * auth.ts — server-side session helpers
 *
 * Strategy: on login, we generate a random session token, store the
 * session payload in a server-side Map (in-memory for this app, swap
 * for Redis / DB in production), and set an HttpOnly cookie on the
 * client. Every protected route calls `requireSession` which reads
 * the cookie, looks up the session, and returns the stored user info.
 *
 * No JWT: simpler to revoke (just delete from the Map on logout).
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const COOKIE_NAME = 'fixhub_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'reception' | 'engineer';
  isActive: boolean;
}

interface Session {
  user: SessionUser;
  expiresAt: number;
}

// ── In-memory session store ──────────────────────────────────────
// Global singleton that survives hot-reload in dev.
declare global {
  // eslint-disable-next-line no-var
  var __fixhub_sessions: Map<string, Session> | undefined;
}
const sessions: Map<string, Session> =
  globalThis.__fixhub_sessions ?? (globalThis.__fixhub_sessions = new Map());

// Periodically evict expired sessions (lazy GC).
function pruneExpired() {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expiresAt < now) sessions.delete(token);
  }
}

// ── Public helpers ───────────────────────────────────────────────

/** Create a session and return the opaque token. */
export function createSession(user: SessionUser): string {
  pruneExpired();
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { user, expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

/** Destroy a session by token. */
export function destroySession(token: string) {
  sessions.delete(token);
}

/** Look up a session by token. Returns null if missing or expired. */
export function getSession(token: string): SessionUser | null {
  pruneExpired();
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session.user;
}

// ── Route-level guards ───────────────────────────────────────────

type AllowedRoles = ('admin' | 'reception' | 'engineer')[];

/**
 * Call at the top of every protected route handler.
 *
 * Returns `{ user }` on success, or `{ error: NextResponse }` if the
 * request is unauthenticated / unauthorised.
 *
 * Usage:
 *   const auth = await requireSession(allowedRoles);
 *   if ('error' in auth) return auth.error;
 *   const { user } = auth;
 */
export async function requireSession(
  allowedRoles?: AllowedRoles
): Promise<{ user: SessionUser } | { error: NextResponse }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return {
      error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }),
    };
  }

  const user = getSession(token);
  if (!user) {
    return {
      error: NextResponse.json(
        { error: 'Session expired or invalid. Please log in again.' },
        { status: 401 }
      ),
    };
  }

  if (!user.isActive) {
    return {
      error: NextResponse.json({ error: 'Account is disabled.' }, { status: 403 }),
    };
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return {
      error: NextResponse.json(
        { error: 'You do not have permission to perform this action.' },
        { status: 403 }
      ),
    };
  }

  return { user };
}

/** Build Set-Cookie options for the session cookie. */
export function sessionCookieOptions(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  };
}

/** Build an expired Set-Cookie to clear the session cookie. */
export function clearCookieOptions() {
  return {
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };
}

// ── Input validation helpers ─────────────────────────────────────

const LIMITS = {
  name: 120,
  email: 254,
  password: 128,
  phone: 20,
  address: 300,
  text: 1000,
  notes: 2000,
  shortText: 200,
};

export function validateLength(
  value: unknown,
  field: string,
  max: number
): string | null {
  if (typeof value !== 'string') return null; // type errors caught elsewhere
  if (value.length > max) {
    return `${field} must be at most ${max} characters.`;
  }
  return null;
}

/** Run multiple length checks, return first error or null. */
export function checkLengths(
  checks: Array<[unknown, string, number]>
): string | null {
  for (const [value, field, max] of checks) {
    const err = validateLength(value, field, max);
    if (err) return err;
  }
  return null;
}

export { LIMITS };

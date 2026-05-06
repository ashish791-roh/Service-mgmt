/**
 * auth.ts — server-side session helpers
 *
 * Sessions are stored in the `Session` table in PostgreSQL via Prisma.
 * This replaces the old in-memory Map which was wiped on every
 * serverless cold-start / process restart in production.
 *
 * Prerequisites — your prisma/schema.prisma must include:
 *
 *   model Session {
 *     token     String   @id @db.VarChar(64)
 *     userId    String
 *     payload   Json
 *     expiresAt DateTime
 *     createdAt DateTime @default(now())
 *
 *     @@index([userId])
 *     @@index([expiresAt])
 *   }
 *
 * Run: npx prisma migrate dev --name add-sessions
 */

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export const COOKIE_NAME = 'fixhub_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'reception' | 'engineer';
  isActive: boolean;
}

// ── Public helpers ───────────────────────────────────────────────

/** Create a persistent session and return the opaque token. */
export async function createSession(user: SessionUser): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await (prisma as any).session.create({
    data: {
      token,
      userId: user.id,
      payload: user as any,
      expiresAt,
    },
  });

  // Best-effort background prune of expired sessions
  (prisma as any).session
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => {});

  return token;
}

/** Destroy a session by token (logout). */
export async function destroySession(token: string): Promise<void> {
  try {
    await (prisma as any).session.deleteMany({ where: { token } });
  } catch {/**/}
}

/** Destroy ALL sessions for a user (e.g. account deactivated). */
export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  try {
    await (prisma as any).session.deleteMany({ where: { userId } });
  } catch { /**/ }
}

/** Look up a live session by token. Returns null if missing or expired. */
export async function getSession(token: string): Promise<SessionUser | null> {
  try {
    const session = await (prisma as any).session.findUnique({
      where: { token },
    });

    if (!session) return null;

    if (new Date(session.expiresAt) < new Date()) {
      destroySession(token).catch(() => {});
      return null;
    }

    return session.payload as SessionUser;
  } catch {
    return null;
  }
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

  const user = await getSession(token);
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
  if (typeof value !== 'string') return null;
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
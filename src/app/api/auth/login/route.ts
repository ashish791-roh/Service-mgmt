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

    // Input length caps
    const lengthError = checkLengths([
      [email, 'email', LIMITS.email],
      [password, 'password', LIMITS.password],
    ]);
    if (lengthError) {
      return NextResponse.json({ error: lengthError }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: (email as string).trim().toLowerCase() },
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
    const token = createSession(sessionUser);

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

// ── DELETE /api/auth/login  (logout) ─────────────────────────────

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (token) destroySession(token);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(clearCookieOptions());
    return response;
  } catch (error) {
    console.error('[auth/logout]', error);
    return NextResponse.json({ error: 'Logout failed.' }, { status: 500 });
  }
}

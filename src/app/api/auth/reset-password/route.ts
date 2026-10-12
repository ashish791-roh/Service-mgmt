import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { destroyAllSessionsForUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/auditLog';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { token, password } = body;
    if (!token || !password || typeof token !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Token and new password are required.' }, { status: 400 });
    }

    if (password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: 'Password must be between 8 and 128 characters.' }, { status: 400 });
    }

    // Password strength check
    const strongPassword = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!strongPassword.test(password)) {
      return NextResponse.json({
        error: 'Password must include one uppercase letter, one digit, and one special character.'
      }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired password reset token.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    // Invalidate all active sessions for this user (session hijacking prevention)
    await destroyAllSessionsForUser(user.id);

    await createAuditLog('PASSWORD_RESET_SUCCESS', user.id, { timestamp: new Date().toISOString() });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[POST /api/auth/reset-password]', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

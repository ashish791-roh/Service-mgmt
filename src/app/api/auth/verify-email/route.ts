import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/auditLog';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Verification token is required.' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired verification token.' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
      },
    });

    await createAuditLog('EMAIL_VERIFIED', user.id, { timestamp: new Date().toISOString() });

    // Redirect to login page with verification success flag
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('verified', 'true');
    return NextResponse.redirect(loginUrl);
  } catch (error) {
    console.error('[GET /api/auth/verify-email]', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

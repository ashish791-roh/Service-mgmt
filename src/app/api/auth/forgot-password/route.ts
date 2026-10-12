import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendMail } from '@/lib/mail';
import crypto from 'crypto';
import { createAuditLog } from '@/lib/auditLog';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { email } = body;
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const emailLowercase = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: emailLowercase },
    });

    // Security best practice: do not leak user existence.
    // Return success even if the email was not found.
    if (!user || !user.isActive) {
      return NextResponse.json({ ok: true });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpires,
      },
    });

    await createAuditLog('PASSWORD_RESET_REQUESTED', user.id, { timestamp: new Date().toISOString() });

    const baseUrl = process.env.HQ_BASE_URL || new URL(request.url).origin;
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    await sendMail({
      to: user.email,
      subject: 'Reset your password — FixHub',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a;">Password Reset Request</h2>
          <p>Hi ${user.name},</p>
          <p>We received a request to reset your password for your FixHub account. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #64748b; font-size: 0.875rem;">This link is valid for 1 hour. If you did not make this request, you can safely ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[POST /api/auth/forgot-password]', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

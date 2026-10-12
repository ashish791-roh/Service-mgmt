import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { generateSecret, getOtpAuthUrl } from '@/lib/totp';
import QRCode from 'qrcode';

export async function POST() {
  const auth = await requireSession(['admin', 'super_admin']);
  if ('error' in auth) return auth.error;

  try {
    const { user } = auth;
    const secret = generateSecret();
    const otpAuthUrl = getOtpAuthUrl(user.email, secret);
    const qrCode = await QRCode.toDataURL(otpAuthUrl);

    return NextResponse.json({
      secret,
      qrCode,
    });
  } catch (error) {
    console.error('[POST /api/auth/mfa/setup]', error);
    return NextResponse.json({ error: 'Failed to generate MFA setup.' }, { status: 500 });
  }
}

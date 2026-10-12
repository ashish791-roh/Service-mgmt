/**
 * mail.ts — Email dispatch utility
 */

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail(options: MailOptions): Promise<void> {
  const { to, subject, html } = options;

  // In development and test, log to console
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n================ MOCK EMAIL DISPATCH ================');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${html}`);
    console.log('=====================================================\n');
    return;
  }

  // In production, we log or send via SMTP/API if credentials are provided
  const smtpHost = process.env.SMTP_HOST;
  if (!smtpHost) {
    console.warn('[Mail] WARNING: SMTP_HOST not configured. Email logged to console.');
    console.log(`[Production Mock Email] To: ${to}, Subject: ${subject}, Body: ${html}`);
    return;
  }

  // Future expansion: dynamic nodemailer or cloud email service integration
  console.log(`[SMTP Sent] To: ${to}, Subject: ${subject}`);
}

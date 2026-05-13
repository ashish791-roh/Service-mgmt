/**
 * customerNotifications.ts
 *
 * Sends customer-facing notifications via:
 *   - Twilio SMS (works instantly — no customer opt-in needed)
 *   - SendGrid Email (optional — only if customer has an email on record)
 *
 * Required environment variables:
 *   TWILIO_ACCOUNT_SID   — Twilio Account SID
 *   TWILIO_AUTH_TOKEN    — Twilio Auth Token
 *   TWILIO_SMS_FROM      — Your Twilio phone number, e.g. "+13365687298"
 *
 * Optional (email channel):
 *   SENDGRID_API_KEY     — SendGrid API key
 *   SENDGRID_FROM_EMAIL  — Verified sender email
 *   SENDGRID_FROM_NAME   — Sender display name
 *
 * Usage:
 *   import { notifyCustomerStatusChange } from '@/lib/customerNotifications';
 *   await notifyCustomerStatusChange({ customerName, phone, email, jobId, newStatus, deviceInfo });
 */

export type NotifiableStatus = 'Assigned' | 'In Progress' | 'Completed' | 'Delivered';

export interface CustomerNotificationPayload {
  customerName: string;
  /** Raw phone number — will be normalised to E.164 automatically */
  phone: string;
  /** Optional — if absent, email notification is skipped */
  email?: string | null;
  /** Job ID for reference in the message */
  jobId: string;
  /** The new status that triggered the notification */
  newStatus: NotifiableStatus;
  /** Human-readable device description, e.g. "Dell Laptop (Inspiron 15)" */
  deviceInfo?: string;
}

// ── Message templates ─────────────────────────────────────────────────────────

const STATUS_LABELS: Record<NotifiableStatus, string> = {
  'Assigned':    'been assigned to a technician',
  'In Progress': 'is now being worked on',
  'Completed':   'been completed',
  'Delivered':   'been delivered',
};

const STATUS_EMOJI: Record<NotifiableStatus, string> = {
  'Assigned':    '🔧',
  'In Progress': '⚙️',
  'Completed':   '✅',
  'Delivered':   '📦',
};

function buildSmsMessage(payload: CustomerNotificationPayload): string {
  const { customerName, jobId, newStatus, deviceInfo } = payload;
  const label  = STATUS_LABELS[newStatus];
  const emoji  = STATUS_EMOJI[newStatus];
  const device = deviceInfo ? ` (${deviceInfo})` : '';
  const short  = jobId.slice(-8).toUpperCase();

  let msg =
    `${emoji} FixHub Service Update\n` +
    `Hi ${customerName}, your repair job${device} has ${label}.\n` +
    `Job Ref: #${short} | Status: ${newStatus}`;

  if (newStatus === 'Completed') {
    msg += `\nYour device is ready for pickup. Please visit us or call reception.`;
  } else if (newStatus === 'Delivered') {
    msg += `\nThank you for choosing FixHub!`;
  }

  return msg;
}

function buildEmailSubject(payload: CustomerNotificationPayload): string {
  const short = payload.jobId.slice(-8).toUpperCase();
  return `[FixHub] Job #${short} — ${payload.newStatus}`;
}

function buildEmailHtml(payload: CustomerNotificationPayload): string {
  const { customerName, jobId, newStatus, deviceInfo } = payload;
  const label  = STATUS_LABELS[newStatus];
  const emoji  = STATUS_EMOJI[newStatus];
  const device = deviceInfo ? ` (${deviceInfo})` : '';
  const short  = jobId.slice(-8).toUpperCase();

  const extraNote =
    newStatus === 'Completed'
      ? '<p style="color:#16a34a;font-weight:600;">Your device is ready for pickup. Please visit us or contact reception at your earliest convenience.</p>'
      : newStatus === 'Delivered'
      ? '<p style="color:#2563eb;font-weight:600;">Thank you for choosing FixHub! We hope to see you again.</p>'
      : '';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="font-family:sans-serif;background:#f3f4f6;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.1);">
    <div style="background:#1d4ed8;padding:20px 24px;">
      <h2 style="margin:0;color:#fff;font-size:18px;">FixHub Service Update ${emoji}</h2>
    </div>
    <div style="padding:24px;">
      <p style="font-size:15px;margin-top:0;">Hi <strong>${customerName}</strong>,</p>
      <p style="font-size:15px;">Your repair job${device} has <strong>${label}</strong>.</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0;font-size:14px;">
        <tr>
          <td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;width:120px;">Job Ref</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;">#${short}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;font-weight:600;">Status</td>
          <td style="padding:8px 12px;border:1px solid #e5e7eb;">${newStatus}</td>
        </tr>
      </table>
      ${extraNote}
      <p style="font-size:13px;color:#6b7280;margin-bottom:0;">For queries, please contact our reception. Do not reply to this email directly.</p>
    </div>
    <div style="padding:12px 24px;background:#f9fafb;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;">
      FixHub Service Management &mdash; automated notification
    </div>
  </div>
</body>
</html>`;
}

// ── Phone number normaliser ───────────────────────────────────────────────────

/**
 * Normalise any phone string to E.164 format.
 * Defaults to India (+91) — change defaultCountryCode if your shop is elsewhere.
 */
function toE164(phone: string, defaultCountryCode = '91'): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    return `+${defaultCountryCode}${digits.slice(1)}`;
  }
  if (digits.startsWith(defaultCountryCode) && digits.length >= 12) {
    return `+${digits}`;
  }
  return `+${defaultCountryCode}${digits}`;
}

// ── Twilio SMS sender ─────────────────────────────────────────────────────────

async function sendSms(payload: CustomerNotificationPayload): Promise<void> {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_SMS_FROM; // e.g. "+13365687298"

  if (!sid || !token || !from) {
    console.warn('[customerNotifications] SMS env vars missing — skipping SMS.');
    return;
  }

  const to   = toE164(payload.phone);
  const body = buildSmsMessage(payload);

  const url  = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');

  const form = new URLSearchParams({ From: from, To: to, Body: body });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });

  const responseText = await res.text();
  if (!res.ok) {
    console.error(`[customerNotifications] SMS send failed (${res.status}):`, responseText);
    console.error(`[customerNotifications] Attempted: From=${from} To=${to}`);
  } else {
    console.log(`[customerNotifications] SMS sent successfully to ${to}. SID:`, JSON.parse(responseText)?.sid);
  }
}

// ── SendGrid email sender ─────────────────────────────────────────────────────

async function sendEmail(payload: CustomerNotificationPayload): Promise<void> {
  if (!payload.email) return; // No email on record — skip silently

  const apiKey    = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  const fromName  = process.env.SENDGRID_FROM_NAME ?? 'FixHub Service';

  if (!apiKey || !fromEmail) {
    console.warn('[customerNotifications] SendGrid env vars missing — skipping email.');
    return;
  }

  const emailBody = {
    personalizations: [
      { to: [{ email: payload.email, name: payload.customerName }] },
    ],
    from: { email: fromEmail, name: fromName },
    subject: buildEmailSubject(payload),
    content: [{ type: 'text/html', value: buildEmailHtml(payload) }],
  };

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailBody),
  });

  if (!res.ok && res.status !== 202) {
    const text = await res.text();
    console.error(`[customerNotifications] Email send failed (${res.status}):`, text);
  } else {
    console.log(`[customerNotifications] Email sent successfully to ${payload.email}`);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Send an SMS + email (if available) to the customer when their job status
 * changes to one of the four key statuses.
 *
 * Both channels run concurrently. Failures are logged but never thrown —
 * they will never break the job update.
 */
export async function notifyCustomerStatusChange(
  payload: CustomerNotificationPayload
): Promise<void> {
  await Promise.allSettled([
    sendSms(payload),
    sendEmail(payload),
  ]).then((results) => {
    results.forEach((r) => {
      if (r.status === 'rejected') {
        console.error('[customerNotifications] Unhandled notification error:', r.reason);
      }
    });
  });
}

// ── Warranty SMS notification ─────────────────────────────────────────────────

export interface WarrantyNotificationPayload {
  customerName: string;
  phone: string;
  jobId: string;
  warrantyDays: number;
  deviceInfo?: string;
  /** Base URL of the app, e.g. https://yourapp.com — used to build the PDF link */
  appBaseUrl?: string;
}

/**
 * Send the customer an SMS with their warranty certificate PDF link.
 * Called automatically when a job transitions to "Completed".
 * Silently no-ops if Twilio env vars are missing.
 */
export async function sendWarrantySms(
  payload: WarrantyNotificationPayload
): Promise<void> {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_SMS_FROM;

  if (!sid || !token || !from) {
    console.warn('[warranty] Twilio env vars missing — skipping warranty SMS.');
    return;
  }

  const baseUrl = payload.appBaseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? '';
  const pdfUrl  = baseUrl ? `${baseUrl}/api/jobs/${payload.jobId}/warranty` : null;
  const short   = payload.jobId.slice(-8).toUpperCase();
  const device  = payload.deviceInfo ? ` (${payload.deviceInfo})` : '';

  let body =
    `🛡️ FixHub Warranty Certificate\n` +
    `Hi ${payload.customerName}, your repair${device} is covered by a ` +
    `${payload.warrantyDays}-day warranty.\n` +
    `Job Ref: #${short}`;

  if (pdfUrl) {
    body += `\nDownload your certificate: ${pdfUrl}`;
  }

  const to   = toE164(payload.phone);
  const url  = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const form = new URLSearchParams({ From: from, To: to, Body: body });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[warranty] SMS send failed (${res.status}):`, text);
    } else {
      console.log(`[warranty] Warranty SMS sent to ${to}`);
    }
  } catch (err) {
    console.error('[warranty] SMS send error:', err);
  }
}
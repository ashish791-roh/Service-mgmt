import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import {
  getAllWebhooks,
  createWebhook,
  type WebhookEvent,
} from '@/lib/webhooks';
import { rateLimiter, RATE_LIMITS } from '@/lib/rateLimit';

const VALID_EVENTS: WebhookEvent[] = [
  'job.status_changed',
  'part.approved',
  'part.rejected',
  'payment.created',
];

// ── GET /api/webhooks — admin only ────────────────────────────────
export async function GET() {
  const auth = await requireSession(['admin']);
  if ('error' in auth) return auth.error;

  return NextResponse.json(getAllWebhooks());
}

// ── POST /api/webhooks — admin only ──────────────────────────────
export async function POST(request: Request) {
  const auth = await requireSession(['admin']);
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();

    // Validation
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'name is required.' }, { status: 400 });
    }
    if (!body.url || typeof body.url !== 'string') {
      return NextResponse.json({ error: 'url is required.' }, { status: 400 });
    }
    try { new URL(body.url); } catch {
      return NextResponse.json({ error: 'url must be a valid URL.' }, { status: 400 });
    }
    if (!Array.isArray(body.events) || body.events.length === 0) {
      return NextResponse.json({ error: 'events must be a non-empty array.' }, { status: 400 });
    }
    const invalidEvents = body.events.filter((e: string) => !VALID_EVENTS.includes(e as WebhookEvent));
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { error: `Invalid events: ${invalidEvents.join(', ')}. Valid: ${VALID_EVENTS.join(', ')}` },
        { status: 400 }
      );
    }

    const hook = createWebhook({
      name: body.name.trim(),
      url: body.url.trim(),
      secret: body.secret?.trim() || undefined,
      events: body.events as WebhookEvent[],
      active: body.active !== false, // default true
    });

    return NextResponse.json(hook, { status: 201 });
  } catch (err) {
    console.error('[api/webhooks POST]', err);
    return NextResponse.json({ error: 'Failed to create webhook.' }, { status: 500 });
  }
}
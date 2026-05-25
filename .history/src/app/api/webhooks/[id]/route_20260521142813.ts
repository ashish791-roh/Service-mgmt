import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import {
  getWebhookById,
  updateWebhook,
  deleteWebhook,
  type WebhookEvent,
} from '@/lib/webhooks';

const VALID_EVENTS: WebhookEvent[] = [
  'job.status_changed',
  'part.approved',
  'part.rejected',
  'payment.created',
];

// ── PUT /api/webhooks/:id — admin only ────────────────────────────
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(['admin']);
  if ('error' in auth) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await getWebhookById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Webhook not found.' }, { status: 404 });
    }

    // Optional validation
    if (body.url !== undefined) {
      try { new URL(body.url); } catch {
        return NextResponse.json({ error: 'url must be a valid URL.' }, { status: 400 });
      }
    }
    if (body.events !== undefined) {
      if (!Array.isArray(body.events) || body.events.length === 0) {
        return NextResponse.json({ error: 'events must be a non-empty array.' }, { status: 400 });
      }
      const bad = body.events.filter((e: string) => !VALID_EVENTS.includes(e as WebhookEvent));
      if (bad.length > 0) {
        return NextResponse.json({ error: `Invalid events: ${bad.join(', ')}` }, { status: 400 });
      }
    }

    const patch: any = {};
    if (body.name !== undefined) patch.name = body.name.trim();
    if (body.url !== undefined) patch.url = body.url.trim();
    if (body.secret !== undefined) patch.secret = body.secret.trim() || undefined;
    if (body.events !== undefined) patch.events = body.events;
    if (body.active !== undefined) patch.active = Boolean(body.active);

    const updated = await updateWebhook(id, patch);
    return NextResponse.json(updated);
  } catch (err) {
    console.error('[api/webhooks/[id] PUT]', err);
    return NextResponse.json({ error: 'Failed to update webhook.' }, { status: 500 });
  }
}

// ── DELETE /api/webhooks/:id — admin only ─────────────────────────
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(['admin']);
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const removed = await deleteWebhook(id);
  if (!removed) {
    return NextResponse.json({ error: 'Webhook not found.' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
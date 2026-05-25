import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getWebhookById, testWebhook } from '@/lib/webhooks';

// POST /api/webhooks/test  { id: string }
export async function POST(request: Request) {
  const auth = await requireSession(['admin']);
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'id is required.' }, { status: 400 });
    }
    const hook = await getWebhookById(body.id);
    if (!hook) {
      return NextResponse.json({ error: 'Webhook not found.' }, { status: 404 });
    }

    const result = await testWebhook(hook);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[api/webhooks/test POST]', err);
    return NextResponse.json({ error: 'Test delivery failed.' }, { status: 500 });
  }
}
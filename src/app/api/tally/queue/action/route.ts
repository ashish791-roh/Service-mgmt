import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { processTallyQueue } from '@/lib/tallyQueue';
import { broadcastTallyEvent } from '@/lib/tallyEvents';

export async function POST(request: Request) {
  const auth = await requireSession(request, ['admin']);
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { action, id, ids } = body;

    if (!['retry', 'cancel', 'cleanup'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const targetIds: string[] = [];
    if (id) targetIds.push(String(id));
    if (Array.isArray(ids)) targetIds.push(...ids.map(String));

    if (action === 'retry') {
      if (targetIds.length > 0) {
        await prisma.tallyQueueItem.updateMany({
          where: { id: { in: targetIds } },
          data: {
            status: 'pending',
            retryCount: 0,
            nextRetryAt: null,
            errorMessage: null,
          },
        });
        broadcastTallyEvent('queue_updated', { action: 'retry', ids: targetIds });
      } else {
        // Retry all failed/cancelled items
        await prisma.tallyQueueItem.updateMany({
          where: { status: { in: ['failed', 'cancelled'] } },
          data: {
            status: 'pending',
            retryCount: 0,
            nextRetryAt: null,
            errorMessage: null,
          },
        });
        broadcastTallyEvent('queue_updated', { action: 'retry_all' });
      }

      // Trigger queue processor immediately in background
      processTallyQueue().catch(err => console.error('[Tally Queue Action] process error:', err));

      return NextResponse.json({ success: true, message: 'Sync retries scheduled.' });
    }

    if (action === 'cancel') {
      if (targetIds.length > 0) {
        await prisma.tallyQueueItem.updateMany({
          where: { id: { in: targetIds } },
          data: {
            status: 'cancelled',
            nextRetryAt: null,
          },
        });
        broadcastTallyEvent('queue_updated', { action: 'cancel', ids: targetIds });
      } else {
        // Cancel all pending/retrying items
        await prisma.tallyQueueItem.updateMany({
          where: { status: { in: ['pending', 'retrying'] } },
          data: {
            status: 'cancelled',
            nextRetryAt: null,
          },
        });
        broadcastTallyEvent('queue_updated', { action: 'cancel_all' });
      }
      return NextResponse.json({ success: true, message: 'Sync items cancelled.' });
    }

    if (action === 'cleanup') {
      const deleted = await prisma.tallyQueueItem.deleteMany({
        where: { status: { in: ['completed', 'cancelled'] } },
      });
      broadcastTallyEvent('queue_updated', { action: 'cleanup' });
      return NextResponse.json({ success: true, count: deleted.count, message: 'Queue cleaned up.' });
    }

    return NextResponse.json({ error: 'Action failed' }, { status: 400 });
  } catch (err) {
    console.error('[api/tally/queue/action POST]', err);
    return NextResponse.json({ error: 'Failed to execute queue action.' }, { status: 500 });
  }
}

import { requireSession } from '@/lib/auth';
import { tallyEventEmitter } from '@/lib/tallyEvents';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Authenticate session
  const auth = await requireSession(request, ['admin']);
  if ('error' in auth) return auth.error;

  const responseHeaders = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  };

  const encoder = new TextEncoder();

  // Create stream
  const stream = new ReadableStream({
    start(controller) {
      // 2. Event broadcast handler
      const onAllEvents = (payload: { event: string; data: any }) => {
        try {
          const sseMessage = `event: ${payload.event}\ndata: ${JSON.stringify(payload.data)}\n\n`;
          controller.enqueue(encoder.encode(sseMessage));
        } catch (err) {
          console.error('[tally sse] enqueue failed:', err);
        }
      };

      // Subscribe to emitter
      tallyEventEmitter.on('all', onAllEvents);

      // Heartbeat interval to prevent connection drops (every 15s)
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          // Stream closed
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      // Cleanup when stream closes
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        tallyEventEmitter.off('all', onAllEvents);
      });
    },
  });

  return new Response(stream, { headers: responseHeaders });
}

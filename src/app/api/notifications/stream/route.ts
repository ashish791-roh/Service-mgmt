import { NextRequest } from 'next/server';
import { requireSession } from '@/lib/auth';
import { UpdatesEmitter } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Validate session
  const auth = await requireSession(request);
  if ('error' in auth) {
    return auth.error;
  }

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Helper to push SSE data to client
  const sendSSE = (event: string, data: any) => {
    try {
      writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    } catch (e) {
      // Stream might be closed
    }
  };

  // Subscribe to updates emitter
  const unsubscribe = UpdatesEmitter.subscribe((type) => {
    sendSSE('update', { type, timestamp: Date.now() });
  });

  // Heartbeat to keep connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      writer.write(encoder.encode(': heartbeat\n\n'));
    } catch (e) {
      clearInterval(heartbeatInterval);
    }
  }, 20_000);

  // Handle client disconnection
  request.signal.addEventListener('abort', () => {
    clearInterval(heartbeatInterval);
    unsubscribe();
    try {
      writer.close();
    } catch (e) {
      // Ignore double close
    }
  });

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

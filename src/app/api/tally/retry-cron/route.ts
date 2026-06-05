import { NextResponse } from 'next/server';
import { processTallyRetryQueue } from '@/lib/tally';

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    await processTallyRetryQueue();
    return NextResponse.json({ success: true, message: 'Tally retry queue processed successfully.' });
  } catch (error) {
    console.error('[api/tally/retry-cron]', error);
    return NextResponse.json(
      { error: `Failed to process Tally retry queue: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}

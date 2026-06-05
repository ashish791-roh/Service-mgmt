import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getClientIP, rateLimiter, RATE_LIMITS } from '@/lib/rateLimit';
import { pushJobToTally } from '@/lib/tally';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const auth = await requireSession(request, ['admin']);
  if ('error' in auth) return auth.error;

  const ip = getClientIP(request);
  const limit = await rateLimiter.check(`api:tally:push-job:${auth.user.id}:${ip}`, RATE_LIMITS.MODERATE);
  if (limit.isLimited) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${limit.retryAfter} seconds.` },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const jobId = String(body.jobId || '');

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
    }

    if (job.status !== 'Delivered') {
      return NextResponse.json({ error: 'Only delivered jobs can be pushed retroactively.' }, { status: 400 });
    }

    // Call pushJobToTally which creates the TallyDocument and auto-pushes it if sync is enabled
    await pushJobToTally(jobId);

    // Fetch the generated document to see if it pushed successfully or failed
    const doc = await prisma.tallyDocument.findFirst({
      where: { fileName: `job-${jobId}-invoice.pdf` },
      orderBy: { createdAt: 'desc' },
    });

    if (doc?.status === 'pushed') {
      return NextResponse.json({ success: true, message: 'Job invoice successfully pushed to Tally.' });
    } else if (doc?.status === 'failed') {
      return NextResponse.json({ success: false, error: 'Push failed but scheduled for retry.', status: 'failed' });
    } else {
      return NextResponse.json({ success: true, message: 'Job invoice generated and queued for push.' });
    }
  } catch (error) {
    console.error('[api/tally/push-job POST]', error);
    return NextResponse.json({ error: 'Failed to push job to Tally.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { getClientIP, rateLimiter, RATE_LIMITS } from '@/lib/rateLimit';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const auth = await requireSession(request, ['admin']);
  if ('error' in auth) return auth.error;

  const ip = getClientIP(request);
  const limit = await rateLimiter.check(`api:tally:pending-jobs:${auth.user.id}:${ip}`, RATE_LIMITS.MODERATE);
  if (limit.isLimited) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${limit.retryAfter} seconds.` },
      { status: 429 }
    );
  }

  try {
    // 1. Fetch all delivered jobs
    const deliveredJobs = await prisma.job.findMany({
      where: { status: 'Delivered' },
      include: {
        customer: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    // 2. Fetch all successfully pushed sales vouchers
    const pushedDocs = await prisma.tallyDocument.findMany({
      where: {
        fileName: { startsWith: 'job-' },
        status: 'pushed',
        voucherType: 'sales',
      },
      select: { fileName: true },
    });

    // Extract job IDs from fileName: "job-${jobId}-invoice.pdf"
    const pushedJobIds = new Set(
      pushedDocs
        .map((d: any) => {
          const match = d.fileName.match(/^job-(.+)-invoice\.pdf$/);
          return match ? match[1] : null;
        })
        .filter(Boolean)
    );

    // 3. Filter for delivered jobs without a pushed Tally document
    const pendingJobs = deliveredJobs
      .filter((j: any) => !pushedJobIds.has(j.id))
      .map((j: any) => ({
        id: j.id,
        invoiceNumber: j.invoiceNumber ?? `INV-${j.id.slice(-6).toUpperCase()}`,
        customerName: j.customer.name,
        completedAt: j.completedAt || j.updatedAt,
        actualCost: j.actualCost ?? j.estimatedCost ?? 0,
      }));

    return NextResponse.json({ pendingJobs });
  } catch (error) {
    console.error('[api/tally/pending-jobs GET]', error);
    return NextResponse.json({ error: 'Failed to load pending historical jobs.' }, { status: 500 });
  }
}

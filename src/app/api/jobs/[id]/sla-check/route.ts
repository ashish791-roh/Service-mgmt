import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';

/**
 * POST /api/jobs/:id/sla-check
 *
 * Called by the frontend when it detects an SLA breach for a job.
 * Pushes a notification to:
 *   1. The assigned engineer (if any)
 *   2. All admin users
 *
 * Deduplication: if an unread SLA-breach notification already exists
 * for this job + user pair, no duplicate is created.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Any authenticated user may trigger an SLA check
  const auth = await requireSession();
  if ('error' in auth) return auth.error;

  try {
    const { id: jobId } = await params;
    const body = await request.json().catch(() => ({}));
    const label: string = body.label ?? 'SLA breached';
    const tierName: string = body.tierName ?? '';

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, engineerId: true, problemDesc: true, status: true },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
    }

    // Terminal jobs — no SLA alerts needed
    if (['Completed', 'Delivered'].includes(job.status)) {
      return NextResponse.json({ notified: 0 });
    }

    const message = `⚠️ SLA Breached: Job #${jobId.slice(-6).toUpperCase()} (${tierName}) — ${label}. Problem: ${job.problemDesc.slice(0, 60)}`;

    // Collect unique user IDs to notify
    const recipientIds = new Set<string>();

    // 1. Assigned engineer
    if (job.engineerId) recipientIds.add(job.engineerId);

    // 2. All active admins
    const admins = await prisma.user.findMany({
      where: { role: 'admin', isActive: true },
      select: { id: true },
    });
    admins.forEach((a: any) => recipientIds.add(a.id));

    let notified = 0;

    for (const userId of recipientIds) {
      // Dedup: skip if an unread SLA notification for this job already exists
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          jobId,
          read: false,
          message: { contains: 'SLA Breached' },
        },
      });
      if (existing) continue;

      await prisma.notification.create({
        data: { userId, jobId, message },
      });
      notified++;
    }

    return NextResponse.json({ notified });
  } catch (error) {
    console.error('[api/jobs/sla-check POST]', error);
    return NextResponse.json({ error: 'Failed to process SLA check.' }, { status: 500 });
  }
}

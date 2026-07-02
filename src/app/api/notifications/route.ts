import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { rateLimiter, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';
import { captureChange } from '@/lib/branchSync';
import { withLocalBranchId } from '@/lib/branchContext';

export async function GET() {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;
  const { user } = auth;

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({
    notifications: notifications.map((n: any) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
    })),
  }, {
    headers: {
      'Cache-Control': 'private, max-age=15, stale-while-revalidate=30'
    }
  });
}

// POST /api/notifications — admin only: broadcast an announcement to all users
export async function POST(request: Request) {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    if (auth.user.role !== 'admin') {
        return NextResponse.json({ error: 'Only admins can post announcements.' }, { status: 403 });
    }

    // ── Rate limiting ─────────────────────────────────────────────
    const ip = getClientIP(request);
    const limit = await rateLimiter.check(
        `api:notifications:${auth.user.id}:${ip}`,
        RATE_LIMITS.STRICT
    );
    if (limit.isLimited) {
        return NextResponse.json(
            { error: `Too many requests. Try again in ${limit.retryAfter} seconds.` },
            { status: 429, headers: { 'Retry-After': limit.retryAfter.toString() } }
        );
    }

    try {
        const body = await request.json();
        const message: string = (body.message ?? '').trim();

        if (!message) {
            return NextResponse.json({ error: 'message is required.' }, { status: 400 });
        }

        // Fetch all active users
        const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } });

        if (users.length === 0) {
            return NextResponse.json({ created: 0 });
        }

        // Create one notification per user
        const createdNotifications = await Promise.all(
            users.map((u: any) =>
                prisma.notification.create({
                    data: withLocalBranchId({
                        userId: u.id,
                        message: `📢 Announcement: ${message}`,
                        read: false,
                    }),
                })
            )
        );

        for (const notif of createdNotifications) {
            captureChange({
                entityType: 'Notification',
                entityId: notif.id,
                action: 'create',
                payload: notif,
            }).catch(err => console.error('[SyncOutbox] Announcement notification create error:', err));
        }


        return NextResponse.json({ created: users.length });
    } catch (error) {
        console.error('[api/notifications POST]', error);
        return NextResponse.json({ error: 'Failed to post announcement.' }, { status: 500 });
    }
}

// PUT /api/notifications — any authenticated user can mark their own notifications read
export async function PUT(request: Request) {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;

    // ── Rate limiting ─────────────────────────────────────────────
    const ip = getClientIP(request);
    const limit = await rateLimiter.check(
        `api:notifications-read:${auth.user.id}:${ip}`,
        RATE_LIMITS.LENIENT
    );
    if (limit.isLimited) {
        return NextResponse.json(
            { error: `Too many requests. Try again in ${limit.retryAfter} seconds.` },
            { status: 429, headers: { 'Retry-After': limit.retryAfter.toString() } }
        );
    }

    try {
        const body = await request.json();

        if (!body.id) {
            return NextResponse.json({ error: 'id is required.' }, { status: 400 });
        }

        // Verify the notification belongs to the calling user
        const existing = await prisma.notification.findUnique({
            where: { id: body.id },
            select: { userId: true },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Notification not found.' }, { status: 404 });
        }

        // Only allow users to mark their own notifications (admins may mark any)
        if (auth.user.role !== 'admin' && existing.userId !== auth.user.id) {
            return NextResponse.json(
                { error: 'You may only update your own notifications.' },
                { status: 403 }
            );
        }

        const notification = await prisma.notification.update({
            where: { id: body.id },
            data: { read: true },
        });

        // ── Outbox Sync ──────────────────────────────────────────────
        captureChange({
            entityType: 'Notification',
            entityId: notification.id,
            action: 'update',
            payload: notification,
        }).catch(err => console.error('[SyncOutbox] Notification update error:', err));


        return NextResponse.json({
            ...notification,
            createdAt: notification.createdAt.toISOString(),
        });
    } catch (error) {
        if (error && typeof error === 'object' && 'code' in error) {
            const err = error as { code: string };
            if (err.code === 'P2025') {
                return NextResponse.json({ error: 'Notification not found.' }, { status: 404 });
            }
        }
        console.error('[api/notifications PUT]', error);
        return NextResponse.json({ error: 'Failed to update notification.' }, { status: 500 });
    }
}
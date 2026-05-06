import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';

// PUT /api/notifications — any authenticated user can mark their own notifications read
export async function PUT(request: Request) {
    const auth = await requireSession();
    if ('error' in auth) return auth.error;

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

        return NextResponse.json({
            ...notification,
            createdAt: notification.createdAt.toISOString(),
        });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'Notification not found.' }, { status: 404 });
        }
        console.error('[api/notifications PUT]', error);
        return NextResponse.json({ error: 'Failed to update notification.' }, { status: 500 });
    }
}

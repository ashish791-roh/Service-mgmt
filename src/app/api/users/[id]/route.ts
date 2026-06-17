import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { requireSession, destroyAllSessionsForUser, LIMITS, checkLengths } from '@/lib/auth';
import { writeAuditLog } from '@/lib/auditLog';
import type { Prisma } from '@prisma/client';
import { captureChange } from '@/lib/branchSync';


// PUT /api/users/:id — admin only
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireSession(['admin']);
    if ('error' in auth) return auth.error;

    try {
        const { id } = await params;
        const body = await request.json();

        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        // Only super_admin can modify a super_admin
        if (targetUser.role === 'super_admin' && auth.user.role !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden: Cannot modify a super_admin user.' }, { status: 403 });
        }

        if (body.role) {
            const validRoles = auth.user.role === 'super_admin'
                ? ['admin', 'reception', 'engineer', 'super_admin']
                : ['admin', 'reception', 'engineer'];
            if (!validRoles.includes(body.role)) {
                return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
            }
        }

        const lengthError = checkLengths([
            [body.name, 'name', LIMITS.name],
            [body.email, 'email', LIMITS.email],
            [body.password, 'password', LIMITS.password],
        ]);
        if (lengthError) {
            return NextResponse.json({ error: lengthError }, { status: 400 });
        }

        const updateData: Prisma.UserUpdateInput = {};

        if (typeof body.isActive === 'boolean') {
            // Prevent admin from deactivating themselves
            if (auth.user.id === id && body.isActive === false) {
                return NextResponse.json(
                    { error: 'You cannot deactivate your own account.' },
                    { status: 400 }
                );
            }
            updateData.isActive = body.isActive;
        }

        if (body.name)  updateData.name  = body.name.trim();
        if (body.email) updateData.email = body.email.trim().toLowerCase();
        if (body.role)  updateData.role  = body.role;
        if (body.password && body.password.length >= 4) {
            updateData.password = await bcrypt.hash(body.password, 10);
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
        });

        // ── Outbox Sync ──────────────────────────────────────────────
        captureChange({
            entityType: 'User',
            entityId: user.id,
            action: 'update',
            payload: user,
        }).catch(err => console.error('[SyncOutbox] User update error:', err));


        // If the account was just deactivated, kill all active sessions immediately
        // so the user is logged out right away rather than waiting for token expiry.
        if (typeof body.isActive === 'boolean' && !body.isActive) {
            await destroyAllSessionsForUser(id);
        }

        // ── Audit log — user updated ────────────────────────────
        {
            const changedFields = Object.keys(updateData).filter(f => f !== 'password');
            for (const f of changedFields) {
                writeAuditLog({
                    actor: { id: auth.user.id, name: auth.user.name, role: auth.user.role },
                    action: 'update', entity: 'user', entityId: id, field: f,
                    newValue: f === 'password' ? '[redacted]' : updateData[f as keyof Prisma.UserUpdateInput],
                }).catch(() => {});
            }
            if (body.password && body.password.length >= 4) {
                writeAuditLog({
                    actor: { id: auth.user.id, name: auth.user.name, role: auth.user.role },
                    action: 'update', entity: 'user', entityId: id, field: 'password',
                    newValue: '[redacted]',
                }).catch(() => {});
            }
        }

        const { password: _, ...safeUser } = user;
        return NextResponse.json({
            ...safeUser,
            active: safeUser.isActive,
            joinedAt: safeUser.createdAt.toISOString().slice(0, 10),
            createdAt: safeUser.createdAt.toISOString(),
        });
    } catch (error) {
        if (error && typeof error === 'object' && 'code' in error) {
            const err = error as { code: string };
            if (err.code === 'P2025') {
                return NextResponse.json({ error: 'User not found.' }, { status: 404 });
            }
            if (err.code === 'P2002') {
                return NextResponse.json({ error: 'Email already in use.' }, { status: 409 });
            }
        }
        console.error('[api/users/[id] PUT]', error);
        return NextResponse.json({ error: 'Failed to update user.' }, { status: 500 });
    }
}

// DELETE /api/users/:id — admin only
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireSession(['admin']);
    if ('error' in auth) return auth.error;

    try {
        const { id } = await params;

        // Prevent admin from deleting themselves
        if (auth.user.id === id) {
            return NextResponse.json(
                { error: 'You cannot delete your own account.' },
                { status: 400 }
            );
        }

        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        // Only super_admin can delete a super_admin
        if (targetUser.role === 'super_admin' && auth.user.role !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden: Cannot delete a super_admin user.' }, { status: 403 });
        }

        // Kill all sessions for the user being deleted before removing the record
        await destroyAllSessionsForUser(id);

        // Clean up all related records in a transaction to avoid FK constraint errors.
        // Jobs assigned to this engineer are unassigned (engineerId → null).
        // Notifications and part requests belonging to the user are deleted first.
        await prisma.$transaction([
            prisma.job.updateMany({
                where: { engineerId: id },
                data: { engineerId: null },
            }),
            prisma.partRequest.deleteMany({ where: { engineerId: id } }),
            prisma.notification.deleteMany({ where: { userId: id } }),
            prisma.user.delete({ where: { id } }),
        ]);

        // ── Outbox Sync ──────────────────────────────────────────────
        captureChange({
            entityType: 'User',
            entityId: id,
            action: 'delete',
            payload: {},
        }).catch(err => console.error('[SyncOutbox] User delete error:', err));


        writeAuditLog({
            actor: { id: auth.user.id, name: auth.user.name, role: auth.user.role },
            action: 'delete', entity: 'user', entityId: id,
        }).catch(() => {});

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error && typeof error === 'object' && 'code' in error) {
            const err = error as { code: string };
            if (err.code === 'P2025') {
                return NextResponse.json({ error: 'User not found.' }, { status: 404 });
            }
        }
        console.error('[api/users/[id] DELETE]', error);
        return NextResponse.json({ error: 'Failed to delete user.' }, { status: 500 });
    }
}
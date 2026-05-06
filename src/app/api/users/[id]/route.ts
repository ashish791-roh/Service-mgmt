import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { requireSession, LIMITS, checkLengths } from '@/lib/auth';

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

        if (body.role) {
            const validRoles = ['admin', 'reception', 'engineer'];
            if (!validRoles.includes(body.role)) {
                return NextResponse.json({ error: 'role must be admin, reception, or engineer.' }, { status: 400 });
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

        const updateData: any = {};

        if (typeof body.isActive === 'boolean') {
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

        const { password: _, ...safeUser } = user;
        return NextResponse.json({
            ...safeUser,
            active: safeUser.isActive,
            joinedAt: safeUser.createdAt.toISOString().slice(0, 10),
            createdAt: safeUser.createdAt.toISOString(),
        });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Email already in use.' }, { status: 409 });
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
        await prisma.user.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }
        console.error('[api/users/[id] DELETE]', error);
        return NextResponse.json({ error: 'Failed to delete user.' }, { status: 500 });
    }
}
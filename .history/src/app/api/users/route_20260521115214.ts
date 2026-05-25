import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { requireSession, LIMITS, checkLengths } from '@/lib/auth';
import { writeAuditLog } from '@/lib/auditLog';
import { rateLimiter, RATE_LIMITS } from '@/lib/rateLimit';

// POST /api/users — admin only
export async function POST(request: Request) {
    // Only admins may create users
    const auth = await requireSession(['admin']);
    if ('error' in auth) return auth.error;

    // ── Rate limiting ─────────────────────────────────────────────
    const adminLimitKey = `api:user-create:${auth.user.id}`;
    const adminLimit = rateLimiter.check(adminLimitKey, RATE_LIMITS.STRICT);

    if (adminLimit.isLimited) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${adminLimit.retryAfter} seconds.` },
        {
          status: 429,
          headers: { 'Retry-After': adminLimit.retryAfter.toString() },
        }
      );
    }

    try {
        const body = await request.json();

        if (!body.name || !body.email || !body.role) {
            return NextResponse.json({ error: 'name, email and role are required.' }, { status: 400 });
        }

        // Role validation
        const validRoles = ['admin', 'reception', 'engineer'];
        if (!validRoles.includes(body.role)) {
            return NextResponse.json({ error: 'role must be admin, reception, or engineer.' }, { status: 400 });
        }

        // Input length caps
        const lengthError = checkLengths([
            [body.name, 'name', LIMITS.name],
            [body.email, 'email', LIMITS.email],
            [body.password, 'password', LIMITS.password],
        ]);
        if (lengthError) {
            return NextResponse.json({ error: lengthError }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(body.password || 'fixhub123', 10);

        const user = await prisma.user.create({
            data: {
                name: body.name.trim(),
                email: body.email.trim().toLowerCase(),
                password: hashedPassword,
                role: body.role,
                isActive: body.isActive ?? true,
            },
        });

        // ── Audit log — user created ────────────────────────────
        writeAuditLog({
            actor: { id: auth.user.id, name: auth.user.name, role: auth.user.role },
            action: 'create', entity: 'user', entityId: user.id,
            meta: { name: user.name, email: user.email, role: user.role },
        }).catch(() => {});

        const { password: _, ...safeUser } = user;
        return NextResponse.json({
            ...safeUser,
            active: safeUser.isActive,
            joinedAt: safeUser.createdAt.toISOString().slice(0, 10),
            createdAt: safeUser.createdAt.toISOString(),
        }, { status: 201 });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
        }
        console.error('[api/users POST]', error);
        return NextResponse.json({ error: 'Failed to create user.' }, { status: 500 });
    }
}

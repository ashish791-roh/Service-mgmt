import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { requireSession, LIMITS, checkLengths } from '@/lib/auth';
import { writeAuditLog } from '@/lib/auditLog';
import { rateLimiter, RATE_LIMITS } from '@/lib/rateLimit';
import { captureChange } from '@/lib/branchSync';
import { withLocalBranchId } from '@/lib/branchContext';
import crypto from 'crypto';
import { sendMail } from '@/lib/mail';


// POST /api/users — admin only
export async function POST(request: Request) {
    // Only admins may create users
    const auth = await requireSession(['admin']);
    if ('error' in auth) return auth.error;

    // ── Rate limiting ─────────────────────────────────────────────
    const adminLimitKey = `api:user-create:${auth.user.id}`;
    const adminLimit = await rateLimiter.check(adminLimitKey, RATE_LIMITS.STRICT);

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

        if (!body.password || typeof body.password !== 'string') {
            return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
        }

        // Password strength: minimum 8 chars, at least 1 uppercase, 1 digit, 1 special char
        const strongPassword = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
        if (!strongPassword.test(body.password)) {
            return NextResponse.json({
                error: 'Password must be at least 8 characters and include one uppercase letter, one digit, and one special character.'
            }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(body.password, 12); // bump cost to 12

        // Fast pre-check — avoids a slow Prisma constraint violation
        const existing = await prisma.user.findUnique({
            where: { email: body.email.trim().toLowerCase() },
            select: { id: true },
        });
        if (existing) {
            return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');

        const user = await prisma.user.create({
            data: withLocalBranchId({
                name: body.name.trim(),
                email: body.email.trim().toLowerCase(),
                password: hashedPassword,
                role: body.role,
                isActive: body.isActive ?? true,
                verificationToken,
                emailVerified: false,
            }),
        });

        // Send email in background/async
        const baseUrl = process.env.HQ_BASE_URL || 'http://localhost:3000';
        const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`;
        sendMail({
            to: user.email,
            subject: 'Verify your email - FixHub',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #0f172a;">Welcome to FixHub</h2>
                    <p>Hi ${user.name},</p>
                    <p>Your account has been created by an administrator. Please click the button below to verify your email address:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verifyUrl}" style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email</a>
                    </div>
                    <p style="color: #64748b; font-size: 0.875rem;">If you did not expect this invitation, you can ignore this email.</p>
                </div>
            `
        }).catch(err => console.error('[Mail] Failed to send verification email:', err));

        // ── Outbox Sync ──────────────────────────────────────────────
        captureChange({
            entityType: 'User',
            entityId: user.id,
            action: 'create',
            payload: user,
        }).catch(err => console.error('[SyncOutbox] User create error:', err));


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
    } catch (error) {
        if (error && typeof error === 'object' && 'code' in error) {
            const err = error as { code: string };
            if (err.code === 'P2002') {
                return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
            }
        }
        console.error('[api/users POST]', error);
        return NextResponse.json({ error: 'Failed to create user.' }, { status: 500 });
    }
}
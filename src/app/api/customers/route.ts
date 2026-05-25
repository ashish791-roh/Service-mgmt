import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, LIMITS, checkLengths } from '@/lib/auth';
import { writeAuditLog } from '@/lib/auditLog';
import { rateLimiter, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';

// ── Validation helpers ───────────────────────────────────────────────────────

/**
 * Accepts:
 *   - 10-digit local numbers:          9876543210
 *   - With country code (+ or 00):     +919876543210  /  00919876543210
 *   - Spaces, hyphens, dots as separators: +91 98765-43210
 * Rejects anything with letters or fewer than 7 / more than 15 digits (ITU E.164).
 */
const PHONE_RE = /^\+?(\d[\s\-.]?){7,15}\d$/;

/** Basic RFC-5321 sanity check — not a full parser, but catches obvious garbage. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validatePhone(phone: string): string | null {
    const digits = phone.replace(/[\s\-.()+]/g, '');
    if (!/^\d+$/.test(digits))      return 'Phone number must contain digits only (spaces, hyphens, dots, and + are allowed).';
    if (!PHONE_RE.test(phone))      return 'Phone number must be between 7 and 15 digits.';
    return null;
}

function validateEmail(email: string): string | null {
    if (!EMAIL_RE.test(email)) return 'Invalid email address.';
    return null;
}

function validateName(name: string): string | null {
    if (name.trim().length < 2) return 'Name must be at least 2 characters.';
    return null;
}

// ── Rate-limit helper shared by all handlers ────────────────────────────────
async function checkRateLimit(request: Request, userId: string) {
    const ip = getClientIP(request);
    const result = await rateLimiter.check(
        `api:customers:${userId}:${ip}`,
        RATE_LIMITS.MODERATE
    );
    return result;
}

// PUT /api/customers?id=xxx — admin or reception
export async function PUT(request: Request) {
    const auth = await requireSession(['admin', 'reception']);
    if ('error' in auth) return auth.error;

    const limit = await checkRateLimit(request, auth.user.id);
    if (limit.isLimited) {
        return NextResponse.json(
            { error: `Too many requests. Try again in ${limit.retryAfter} seconds.` },
            { status: 429, headers: { 'Retry-After': limit.retryAfter.toString() } }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

        const body = await request.json();
        const lengthError = checkLengths([
            [body.name,    'name',    LIMITS.name],
            [body.phone,   'phone',   LIMITS.phone],
            [body.address, 'address', LIMITS.address],
            [body.email,   'email',   LIMITS.email],
        ]);
        if (lengthError) return NextResponse.json({ error: lengthError }, { status: 400 });

        // ── Field-level validation ───────────────────────────────────
        if (body.name != null) {
            const err = validateName(body.name);
            if (err) return NextResponse.json({ error: err }, { status: 400 });
        }
        if (body.phone != null) {
            const err = validatePhone(body.phone.trim());
            if (err) return NextResponse.json({ error: err }, { status: 400 });
        }
        if (body.email != null && body.email.trim() !== '') {
            const err = validateEmail(body.email.trim());
            if (err) return NextResponse.json({ error: err }, { status: 400 });
        }

        const updated = await prisma.customer.update({
            where: { id },
            data: {
                ...(body.name    != null ? { name:    body.name.trim() }                        : {}),
                ...(body.phone   != null ? { phone:   body.phone.trim() }                       : {}),
                ...(body.address != null ? { address: body.address.trim() || null }             : {}),
                ...(body.email   != null ? { email:   body.email.trim().toLowerCase() || null } : {}),
            } as any,
        });

        // ── Audit log — customer updated ────────────────────────────
        {
            const actor = { id: auth.user.id, name: auth.user.name, role: auth.user.role };
            const changedFields: string[] = [];
            if (body.name    != null) changedFields.push('name');
            if (body.phone   != null) changedFields.push('phone');
            if (body.address != null) changedFields.push('address');
            if (body.email   != null) changedFields.push('email');
            for (const f of changedFields) {
                writeAuditLog({
                    actor, action: 'update', entity: 'customer', entityId: id, field: f,
                    oldValue: (updated as any)[f],
                    newValue: (body as any)[f],
                }).catch(() => {});
            }
        }

        return NextResponse.json({
            ...updated,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
        });
    } catch (error: any) {
        console.error('[api/customers PUT]', error);
        if (error?.code === 'P2025') return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
        return NextResponse.json({ error: 'Failed to update customer.' }, { status: 500 });
    }
}

// DELETE /api/customers?id=xxx — admin or reception
export async function DELETE(request: Request) {
    const auth = await requireSession(['admin', 'reception']);
    if ('error' in auth) return auth.error;

    const limit = await checkRateLimit(request, auth.user.id);
    if (limit.isLimited) {
        return NextResponse.json(
            { error: `Too many requests. Try again in ${limit.retryAfter} seconds.` },
            { status: 429, headers: { 'Retry-After': limit.retryAfter.toString() } }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Customer id is required.' }, { status: 400 });

        // Fetch job info for permission check only (with index on customerId, this is fast)
        const customerJobs = await prisma.job.findMany({
            where: { customerId: id },
            select: { id: true, status: true },
        });

        // Reception staff cannot delete a customer who still has active jobs.
        // Admin can delete at any time regardless of job status.
        if (auth.user.role !== 'admin') {
            const activeJobs = customerJobs.filter(
                j => !['Completed', 'Delivered'].includes(j.status as string)
            );
            if (activeJobs.length > 0) {
                return NextResponse.json(
                    { error: `Cannot delete customer with ${activeJobs.length} active job(s). Complete or deliver all jobs first.` },
                    { status: 409 }
                );
            }
        }

        // Delete customer (cascade deletes all related records via onDelete: Cascade)
        await prisma.customer.delete({ where: { id } });

        // ── Audit log — customer deleted (non-blocking) ───────────────────────────
        writeAuditLog({
            actor: { id: auth.user.id, name: auth.user.name, role: auth.user.role },
            action: 'delete', entity: 'customer', entityId: id,
        }).catch(() => {}); // Ignore audit log failures

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error('[api/customers DELETE]', error);
        if (error?.code === 'P2025') return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
        return NextResponse.json({ error: 'Failed to delete customer.' }, { status: 500 });
    }
}

// POST /api/customers — admin or reception
export async function POST(request: Request) {
    const auth = await requireSession(['admin', 'reception']);
    if ('error' in auth) return auth.error;

    const limit = await checkRateLimit(request, auth.user.id);
    if (limit.isLimited) {
        return NextResponse.json(
            { error: `Too many requests. Try again in ${limit.retryAfter} seconds.` },
            { status: 429, headers: { 'Retry-After': limit.retryAfter.toString() } }
        );
    }

    try {
        const body = await request.json();

        // ── Required fields ──────────────────────────────────────────
        if (!body.name || !body.phone) {
            return NextResponse.json({ error: 'name and phone are required.' }, { status: 400 });
        }

        // ── Length limits ────────────────────────────────────────────
        const lengthError = checkLengths([
            [body.name,    'name',    LIMITS.name],
            [body.phone,   'phone',   LIMITS.phone],
            [body.address, 'address', LIMITS.address],
            [body.email,   'email',   LIMITS.email],
        ]);
        if (lengthError) return NextResponse.json({ error: lengthError }, { status: 400 });

        // ── Field-level validation ───────────────────────────────────
        const nameErr = validateName(body.name);
        if (nameErr) return NextResponse.json({ error: nameErr }, { status: 400 });

        const phoneErr = validatePhone(body.phone.trim());
        if (phoneErr) return NextResponse.json({ error: phoneErr }, { status: 400 });

        if (body.email != null && body.email.trim() !== '') {
            const emailErr = validateEmail(body.email.trim());
            if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 });
        }

        // ── Duplicate phone check ────────────────────────────────────
        const existing = await prisma.customer.findFirst({
            where: { phone: body.phone.trim() },
            select: { id: true, name: true },
        });
        if (existing) {
            return NextResponse.json(
                { error: `A customer with this phone number already exists (${existing.name}).` },
                { status: 409 }
            );
        }

        const customer = await prisma.customer.create({
            data: {
                name:    body.name.trim(),
                phone:   body.phone.trim(),
                address: body.address?.trim() || null,
                ...(body.email != null ? { email: body.email.trim().toLowerCase() } : {}),
            } as any,
        });

        // ── Audit log — customer created ────────────────────────────
        writeAuditLog({
            actor: { id: auth.user.id, name: auth.user.name, role: auth.user.role },
            action: 'create', entity: 'customer', entityId: customer.id,
            meta: { name: customer.name, phone: customer.phone },
        }).catch(() => {});

        return NextResponse.json({
            ...customer,
            createdAt: customer.createdAt.toISOString(),
            updatedAt: customer.updatedAt.toISOString(),
        }, { status: 201 });
    } catch (error) {
        console.error('[api/customers POST]', error);
        return NextResponse.json({ error: 'Failed to create customer.' }, { status: 500 });
    }
}
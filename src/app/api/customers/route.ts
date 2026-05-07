import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, LIMITS, checkLengths } from '@/lib/auth';

// POST /api/customers — admin or reception
export async function POST(request: Request) {
    const auth = await requireSession(['admin', 'reception']);
    if ('error' in auth) return auth.error;

    try {
        const body = await request.json();

        if (!body.name || !body.phone) {
            return NextResponse.json({ error: 'name and phone are required.' }, { status: 400 });
        }

        // Input length caps
        const lengthError = checkLengths([
            [body.name,    'name',    LIMITS.name],
            [body.phone,   'phone',   LIMITS.phone],
            [body.address, 'address', LIMITS.address],
            [body.email,   'email',   LIMITS.email],
        ]);
        if (lengthError) {
            return NextResponse.json({ error: lengthError }, { status: 400 });
        }

        const customer = await prisma.customer.create({
            data: {
                name:    body.name.trim(),
                phone:   body.phone.trim(),
                address: body.address?.trim() || null,
                // `email` is optional — only present after the DB migration below.
                // Prisma will ignore this key if the column does not yet exist in the
                // generated client; once migrated it will be stored as provided.
                ...(body.email != null ? { email: body.email.trim().toLowerCase() } : {}),
            } as any, // `as any` removed once Prisma client is regenerated post-migration
        });

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
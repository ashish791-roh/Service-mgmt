import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, LIMITS, checkLengths } from '@/lib/auth';

// PUT /api/customers?id=xxx — admin or reception
export async function PUT(request: Request) {
    const auth = await requireSession(['admin', 'reception']);
    if ('error' in auth) return auth.error;

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

        const updated = await prisma.customer.update({
            where: { id },
            data: {
                ...(body.name    != null ? { name:    body.name.trim() }                        : {}),
                ...(body.phone   != null ? { phone:   body.phone.trim() }                       : {}),
                ...(body.address != null ? { address: body.address.trim() || null }             : {}),
                ...(body.email   != null ? { email:   body.email.trim().toLowerCase() || null } : {}),
            } as any,
        });

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

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Customer id is required.' }, { status: 400 });

        const activeJobs = await prisma.job.findMany({
            where: { customerId: id, status: { notIn: ['Completed', 'Delivered'] } },
            select: { id: true },
        });

        if (activeJobs.length > 0) {
            return NextResponse.json(
                { error: `Cannot delete customer with ${activeJobs.length} active job(s). Complete or deliver all jobs first.` },
                { status: 409 }
            );
        }

        await prisma.customer.delete({ where: { id } });
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

    try {
        const body = await request.json();

        if (!body.name || !body.phone) {
            return NextResponse.json({ error: 'name and phone are required.' }, { status: 400 });
        }

        const lengthError = checkLengths([
            [body.name,    'name',    LIMITS.name],
            [body.phone,   'phone',   LIMITS.phone],
            [body.address, 'address', LIMITS.address],
            [body.email,   'email',   LIMITS.email],
        ]);
        if (lengthError) return NextResponse.json({ error: lengthError }, { status: 400 });

        const customer = await prisma.customer.create({
            data: {
                name:    body.name.trim(),
                phone:   body.phone.trim(),
                address: body.address?.trim() || null,
                ...(body.email != null ? { email: body.email.trim().toLowerCase() } : {}),
            } as any,
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
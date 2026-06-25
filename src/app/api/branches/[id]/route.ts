import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { getDeploymentRole } from '@/lib/branchContext';
import crypto from 'crypto';

// PUT /api/branches/[id] — update (suspend/unsuspend, rotate API key)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(request, ['super_admin']);
  if ('error' in auth) {
    if (getDeploymentRole() !== 'hq') {
      return new NextResponse('Not Found', { status: 404 });
    }
    return auth.error;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, suspended, rotateKey } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (suspended !== undefined) updateData.suspended = !!suspended;

    let newApiKey: string | undefined = undefined;
    if (rotateKey) {
      newApiKey = 'fb_' + crypto.randomBytes(24).toString('hex');
      updateData.apiKey = newApiKey;
    }

    const updated = await prisma.branch.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      branch: updated,
      ...(newApiKey ? { apiKey: newApiKey } : {}),
    });
  } catch (error) {
    console.error('[PUT /api/branches/[id]]', error);
    return NextResponse.json({ error: 'Failed to update branch' }, { status: 500 });
  }
}

// DELETE /api/branches/[id] — delete branch
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(request, ['super_admin']);
  if ('error' in auth) {
    if (getDeploymentRole() !== 'hq') {
      return new NextResponse('Not Found', { status: 404 });
    }
    return auth.error;
  }

  try {
    const { id } = await params;

    const branch = await prisma.branch.findUnique({
      where: { id },
    });

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    if (!branch.suspended) {
      return NextResponse.json({ error: 'Only suspended branches can be deleted' }, { status: 400 });
    }

    await prisma.branch.deleteMany({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/branches/[id]]', error);
    return NextResponse.json({ error: 'Failed to delete branch' }, { status: 500 });
  }
}

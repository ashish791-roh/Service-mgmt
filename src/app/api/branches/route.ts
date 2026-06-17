import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { getDeploymentRole } from '@/lib/branchContext';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// GET /api/branches — super_admin only on HQ
export async function GET(request: Request) {
  const auth = await requireSession(request, ['super_admin']);
  if ('error' in auth) {
    if (getDeploymentRole() !== 'hq') {
      return new NextResponse('Not Found', { status: 404 });
    }
    return auth.error;
  }

  try {
    const branches = await prisma.branch.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(branches);
  } catch (error) {
    console.error('[GET /api/branches]', error);
    return NextResponse.json({ error: 'Failed to fetch branches' }, { status: 500 });
  }
}

// POST /api/branches — register a new branch
export async function POST(request: Request) {
  const auth = await requireSession(request, ['super_admin']);
  if ('error' in auth) {
    if (getDeploymentRole() !== 'hq') {
      return new NextResponse('Not Found', { status: 404 });
    }
    return auth.error;
  }

  try {
    const { id, name } = await request.json();

    if (!id || !name) {
      return NextResponse.json({ error: 'Missing id or name' }, { status: 400 });
    }

    const cleanId = id.trim().toLowerCase();
    const cleanName = name.trim();

    // Check if branch ID already exists
    const existing = await prisma.branch.findUnique({
      where: { id: cleanId },
    });
    if (existing) {
      return NextResponse.json({ error: 'Branch with this ID already exists.' }, { status: 409 });
    }

    // Generate random secure API key
    const apiKey = 'fb_' + crypto.randomBytes(24).toString('hex');

    const branch = await prisma.branch.create({
      data: {
        id: cleanId,
        name: cleanName,
        apiKey,
        suspended: false,
      },
    });

    // Generate credentials
    const adminPassword = `admin_${cleanId}`;
    const receptionPassword = `reception_${cleanId}`;

    const adminHashed = await bcrypt.hash(adminPassword, 10);
    const receptionHashed = await bcrypt.hash(receptionPassword, 10);

    const adminEmail = `admin@${cleanId}.com`;
    const receptionEmail = `reception@${cleanId}.com`;

    // Create default users for this branch
    await prisma.user.createMany({
      data: [
        {
          name: `${cleanName} Admin`,
          email: adminEmail,
          password: adminHashed,
          role: 'admin',
          branchId: cleanId,
        },
        {
          name: `${cleanName} Receptionist`,
          email: receptionEmail,
          password: receptionHashed,
          role: 'reception',
          branchId: cleanId,
        },
      ],
    });

    // Create default inventory items for this branch
    await prisma.inventoryItem.createMany({
      data: [
        {
          name: 'LCD Screen Panel 15"',
          sku: `LCD-15-${cleanId}`,
          category: 'Display',
          quantity: 10,
          minQuantity: 2,
          unitPrice: 2200,
          branchId: cleanId,
        },
        {
          name: 'Charging Port USB-C',
          sku: `CHG-USBC-${cleanId}`,
          category: 'Charging',
          quantity: 15,
          minQuantity: 5,
          unitPrice: 350,
          branchId: cleanId,
        },
      ],
    });

    return NextResponse.json({
      success: true,
      branch,
      apiKey,
      credentials: {
        admin: { email: adminEmail, password: adminPassword },
        reception: { email: receptionEmail, password: receptionPassword },
      }
    }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/branches]', error);
    return NextResponse.json({ error: 'Failed to create branch' }, { status: 500 });
  }
}

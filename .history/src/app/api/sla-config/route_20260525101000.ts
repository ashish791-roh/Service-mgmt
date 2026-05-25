import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_SLA_TIERS, type SLATier } from '@/lib/sla';

/**
 * GET /api/sla-config
 * Fetch SLA tier configuration from database, fallback to defaults
 */
export async function GET() {
  try {
    const config = await prisma.sLAConfig.findUnique({
      where: { id: 'sla-config' },
    });

    if (config && Array.isArray(config.tiers)) {
      return NextResponse.json(config.tiers as unknown as SLATier[]);
    }

    // Return defaults if not found
    return NextResponse.json(DEFAULT_SLA_TIERS);
  } catch (error) {
    console.error('[GET /api/sla-config]', error);
    return NextResponse.json(DEFAULT_SLA_TIERS);
  }
}

/**
 * PUT /api/sla-config
 * Update SLA tier configuration, broadcast to all connected clients
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json() as SLATier[];

    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Body must be an array of SLA tiers' },
        { status: 400 }
      );
    }

    // Validate tiers
    const valid = body.every(t =>
      t.deviceType?.trim() &&
      typeof t.warningHours === 'number' &&
      typeof t.criticalHours === 'number' &&
      t.criticalHours > t.warningHours
    );

    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid tier format or constraints' },
        { status: 400 }
      );
    }

    // Upsert into database
    const updated = await prisma.sLAConfig.upsert({
      where: { id: 'sla-config' },
      create: { id: 'sla-config', tiers: body },
      update: { tiers: body },
    });

    return NextResponse.json({
      ok: true,
      tiers: updated.tiers as SLATier[],
    });
  } catch (error) {
    console.error('[PUT /api/sla-config]', error);
    return NextResponse.json(
      { error: 'Failed to update SLA configuration' },
      { status: 500 }
    );
  }
}
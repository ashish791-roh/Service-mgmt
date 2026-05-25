import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_WARRANTY_ENTRIES, type WarrantyEntry } from '@/lib/warrantyConfig';

/**
 * GET /api/warranty-config
 * Fetch warranty configuration from database, fallback to defaults
 */
export async function GET() {
  try {
    const config = await prisma.warrantyConfig.findUnique({
      where: { id: 'warranty-config' },
    });

    if (config && Array.isArray(config.entries)) {
      return NextResponse.json(config.entries as WarrantyEntry[]);
    }

    // Return defaults if not found
    return NextResponse.json(DEFAULT_WARRANTY_ENTRIES);
  } catch (error) {
    console.error('[GET /api/warranty-config]', error);
    return NextResponse.json(DEFAULT_WARRANTY_ENTRIES);
  }
}

/**
 * PUT /api/warranty-config
 * Update warranty configuration, broadcast to all connected clients
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json() as WarrantyEntry[];

    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Body must be an array of warranty entries' },
        { status: 400 }
      );
    }

    // Validate entries
    const valid = body.every(e =>
      e.deviceType?.trim() &&
      typeof e.days === 'number' &&
      e.days >= 0
    );

    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid warranty entry format' },
        { status: 400 }
      );
    }

    // Upsert into database
    const entriesJson = body as unknown as import('@prisma/client').Prisma.InputJsonValue;
    const updated = await prisma.warrantyConfig.upsert({
      where: { id: 'warranty-config' },
      create: { id: 'warranty-config', entries: entriesJson },
      update: { entries: entriesJson },
    });

    return NextResponse.json({
      ok: true,
      entries: updated.entries as WarrantyEntry[],
    });
  } catch (error) {
    console.error('[PUT /api/warranty-config]', error);
    return NextResponse.json(
      { error: 'Failed to update warranty configuration' },
      { status: 500 }
    );
  }
}
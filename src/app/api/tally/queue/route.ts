import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const auth = await requireSession(request, ['admin']);
  if ('error' in auth) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const status = searchParams.get('status') || '';
    const entityType = searchParams.get('entityType') || '';
    const search = searchParams.get('search')?.trim() || '';

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }
    if (entityType && entityType !== 'all') {
      where.entityType = entityType;
    }
    if (search) {
      where.OR = [
        { entityId: { contains: search, mode: 'insensitive' } },
        { actionType: { contains: search, mode: 'insensitive' } },
        { errorMessage: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.tallyQueueItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.tallyQueueItem.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, limit });
  } catch (err) {
    console.error('[api/tally/queue GET]', err);
    return NextResponse.json({ error: 'Failed to fetch Tally queue items.' }, { status: 500 });
  }
}

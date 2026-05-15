import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { queryAuditLogs } from '@/lib/auditLog';

/**
 * GET /api/audit-logs
 *
 * Query parameters (all optional):
 *   limit     – page size (default 50, max 200)
 *   offset    – pagination offset (default 0)
 *   userId    – filter by actor user id
 *   entity    – filter by entity type ('job' | 'customer' | ...)
 *   entityId  – filter by specific record id
 *   action    – filter by verb ('create' | 'update' | 'delete' | ...)
 *   from      – ISO datetime lower bound
 *   to        – ISO datetime upper bound
 *   search    – full-text substring search across key columns
 *
 * Admin-only endpoint.
 */
export async function GET(request: Request) {
    const auth = await requireSession(['admin']);
    if ('error' in auth) return auth.error;

    const { searchParams } = new URL(request.url);

    const rawLimit = parseInt(searchParams.get('limit') ?? '50', 10);
    const limit = Math.min(isNaN(rawLimit) ? 50 : rawLimit, 200);

    const rawOffset = parseInt(searchParams.get('offset') ?? '0', 10);
    const offset = isNaN(rawOffset) ? 0 : Math.max(0, rawOffset);

    try {
        const { rows, total } = await queryAuditLogs({
            limit,
            offset,
            userId:   searchParams.get('userId')   || undefined,
            entity:   searchParams.get('entity')   || undefined,
            entityId: searchParams.get('entityId') || undefined,
            action:   searchParams.get('action')   || undefined,
            from:     searchParams.get('from')     || undefined,
            to:       searchParams.get('to')       || undefined,
            search:   searchParams.get('search')   || undefined,
        });

        return NextResponse.json({ rows, total, limit, offset });
    } catch (error) {
        console.error('[api/audit-logs GET]', error);
        return NextResponse.json({ error: 'Failed to fetch audit logs.' }, { status: 500 });
    }
}

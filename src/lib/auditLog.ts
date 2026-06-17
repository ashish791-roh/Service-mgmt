/**
 * auditLog.ts
 * -----------
 * Immutable audit-log writer.
 *
 * Every write action (create / update / delete) across the application
 * calls `writeAuditLog(...)`.  Entries are stored in a dedicated
 * `AuditLog` table that is append-only by convention (no UPDATE/DELETE
 * is ever issued against it), which keeps the trail tamper-evident for
 * multi-staff disputes and compliance.
 */

import { prisma } from './prisma';

// ── Public types ──────────────────────────────────────────────────────────────

export interface AuditActor {
    id: string;
    name: string;
    role: string;
}

export interface AuditEntry {
    /** The user performing the action */
    actor: AuditActor;
    /** Verb: 'create' | 'update' | 'delete' | 'approve' | 'reject' | ... */
    action: string;
    /** Table / domain noun: 'job' | 'customer' | 'user' | 'inventory' | 'payment' | 'partRequest' */
    entity: string;
    /** Primary key of the affected record */
    entityId?: string;
    /** For field-level diffs, the field name */
    field?: string;
    /** Serialised previous value (null for create) */
    oldValue?: unknown;
    /** Serialised next value (null for delete) */
    newValue?: unknown;
    /** Any extra context as a plain object */
    meta?: Record<string, unknown>;
}

// ── Core writer ───────────────────────────────────────────────────────────────

/**
 * Append one audit entry.  Never throws — failures are logged to stderr
 * so they cannot disrupt the primary operation.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
    try {
        const serialise = (v: unknown): string | null => {
            if (v === undefined || v === null) return null;
            if (typeof v === 'string') return v;
            return JSON.stringify(v);
        };
        await prisma.auditLog.create({
            data: {
                userId: entry.actor.id,
                userName: entry.actor.name,
                userRole: entry.actor.role,
                action: entry.action,
                entity: entry.entity,
                entityId: entry.entityId ?? null,
                field: entry.field ?? null,
                oldValue: serialise(entry.oldValue),
                newValue: serialise(entry.newValue),
                meta: entry.meta ? JSON.stringify(entry.meta) : null,
            },
        });
    } catch (err) {
        // Never throw — failures are logged to stderr so they cannot disrupt
        // the primary operation
        console.error('[auditLog] Failed to write audit entry:', err);
    }
}

/**
 * Convenience: diff two plain objects and emit one audit entry per
 * changed field.  Skips fields whose values are functionally equal
 * (strict equality after coercing both sides to strings).
 */
export async function auditDiff(
    actor: AuditActor,
    entity: string,
    entityId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    /** Fields to ignore (e.g. timestamps) */
    skipFields: string[] = ['updatedAt', 'createdAt'],
): Promise<void> {
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    const writes: Promise<void>[] = [];
    for (const field of allKeys) {
        if (skipFields.includes(field)) continue;
        const oldVal = before[field];
        const newVal = after[field];
        // Compare as JSON strings for deep equality
        const oldStr = JSON.stringify(oldVal) ?? 'null';
        const newStr = JSON.stringify(newVal) ?? 'null';
        if (oldStr === newStr) continue;
        writes.push(
            writeAuditLog({
                actor,
                action: 'update',
                entity,
                entityId,
                field,
                oldValue: oldVal,
                newValue: newVal,
            }),
        );
    }
    await Promise.all(writes);
}

// ── Query helpers (used by the API route) ────────────────────────────────────

export interface AuditLogRow {
    id: string;
    timestamp: Date | string;
    userId: string;
    userName: string;
    userRole: string;
    action: string;
    entity: string;
    entityId: string | null;
    field: string | null;
    oldValue: string | null;
    newValue: string | null;
    meta: string | null;
}

export interface AuditLogQueryOptions {
    limit?: number;
    offset?: number;
    userId?: string;
    entity?: string;
    entityId?: string;
    action?: string;
    from?: string; // ISO date
    to?: string;   // ISO date
    search?: string;
}

export async function queryAuditLogs(
    opts: AuditLogQueryOptions = {},
): Promise<{ rows: AuditLogRow[]; total: number }> {
    const {
        limit = 50,
        offset = 0,
        userId,
        entity,
        entityId,
        action,
        from,
        to,
        search,
    } = opts;

    // Build Prisma where clauses
    const where: Record<string, any> = {};
    
    if (userId) where.userId = userId;
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;
    if (action) where.action = action;
    
    if (from || to) {
        where.timestamp = {};
        if (from) where.timestamp.gte = new Date(from);
        if (to) where.timestamp.lte = new Date(to);
    }
    
    if (search) {
        where.OR = [
            { userName: { contains: search, mode: 'insensitive' } },
            { entity: { contains: search, mode: 'insensitive' } },
            { entityId: { contains: search, mode: 'insensitive' } },
            { field: { contains: search, mode: 'insensitive' } },
            { oldValue: { contains: search, mode: 'insensitive' } },
            { newValue: { contains: search, mode: 'insensitive' } },
        ];
    }

    // Count
    const total = await prisma.auditLog.count({ where });

    // Fetch data
    const rows = await prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
    });

    return {
        total,
        rows: rows.map((r: any) => ({
            ...r,
            timestamp: r.timestamp.toISOString(),
        })),
    };
}
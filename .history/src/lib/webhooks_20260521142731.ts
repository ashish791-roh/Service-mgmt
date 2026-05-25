/**
 * FixHub Webhook Engine
 *
 * Webhook configurations are now stored in the `Webhook` table via Prisma,
 * replacing the previous flat JSON file which silently failed on serverless
 * deployments (Vercel, Railway) where the filesystem is read-only.
 *
 * Migration: run the SQL in `migrations/add_webhook_table.sql` once against
 * your database, or let the auto-bootstrap in `ensureTable()` handle it on
 * first request.
 *
 * Supported event types:
 *  - job.status_changed
 *  - part.approved
 *  - part.rejected
 *  - payment.created
 */

import crypto from 'crypto';
import { prisma } from './prisma';

// ── Table bootstrap ───────────────────────────────────────────────────────────
// Creates the Webhook table if it doesn't exist yet. This is idempotent and
// safe to call on every cold-start — the IF NOT EXISTS guards prevent any work
// on subsequent calls once the table is in place.

let _tableReady = false;

async function ensureTable(): Promise<void> {
  if (_tableReady) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Webhook" (
      "id"        TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
      "name"      TEXT         NOT NULL,
      "url"       TEXT         NOT NULL,
      "secret"    TEXT,
      "events"    TEXT         NOT NULL,   -- JSON array stored as TEXT
      "active"    BOOLEAN      NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
    )
  `);
  _tableReady = true;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type WebhookEvent =
  | 'job.status_changed'
  | 'part.approved'
  | 'part.rejected'
  | 'payment.created';

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret?: string;
  events: WebhookEvent[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface WebhookDeliveryResult {
  webhookId: string;
  url: string;
  ok: boolean;
  status?: number;
  error?: string;
}

// ── DB row → WebhookConfig ────────────────────────────────────────────────────

function rowToConfig(row: any): WebhookConfig {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    secret: row.secret ?? undefined,
    events: JSON.parse(row.events) as WebhookEvent[],
    active: row.active,
    createdAt: row.createdAt instanceof Date
      ? row.createdAt.toISOString()
      : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date
      ? row.updatedAt.toISOString()
      : String(row.updatedAt),
  };
}

// ── Public CRUD ───────────────────────────────────────────────────────────────

export async function getAllWebhooks(): Promise<WebhookConfig[]> {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "Webhook" ORDER BY "createdAt" DESC`
  );
  return rows.map(rowToConfig);
}

export async function getWebhookById(id: string): Promise<WebhookConfig | undefined> {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "Webhook" WHERE "id" = $1`,
    id
  );
  return rows.length > 0 ? rowToConfig(rows[0]) : undefined;
}

export async function createWebhook(
  input: Omit<WebhookConfig, 'id' | 'createdAt' | 'updatedAt'>
): Promise<WebhookConfig> {
  await ensureTable();
  const now = new Date();
  const id = crypto.randomUUID();
  const eventsJson = JSON.stringify(input.events);

  await prisma.$executeRawUnsafe(
    `INSERT INTO "Webhook" ("id","name","url","secret","events","active","createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    id,
    input.name,
    input.url,
    input.secret ?? null,
    eventsJson,
    input.active,
    now,
    now
  );

  return {
    id,
    name: input.name,
    url: input.url,
    secret: input.secret,
    events: input.events,
    active: input.active,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export async function updateWebhook(
  id: string,
  patch: Partial<Omit<WebhookConfig, 'id' | 'createdAt'>>
): Promise<WebhookConfig | null> {
  await ensureTable();

  // Build SET clause dynamically from provided fields only
  const setClauses: string[] = ['"updatedAt" = $1'];
  const values: any[] = [new Date()];
  let paramIdx = 2;

  if (patch.name !== undefined) {
    setClauses.push(`"name" = $${paramIdx++}`);
    values.push(patch.name);
  }
  if (patch.url !== undefined) {
    setClauses.push(`"url" = $${paramIdx++}`);
    values.push(patch.url);
  }
  if ('secret' in patch) {
    setClauses.push(`"secret" = $${paramIdx++}`);
    values.push(patch.secret ?? null);
  }
  if (patch.events !== undefined) {
    setClauses.push(`"events" = $${paramIdx++}`);
    values.push(JSON.stringify(patch.events));
  }
  if (patch.active !== undefined) {
    setClauses.push(`"active" = $${paramIdx++}`);
    values.push(patch.active);
  }

  values.push(id); // WHERE clause param
  await prisma.$executeRawUnsafe(
    `UPDATE "Webhook" SET ${setClauses.join(', ')} WHERE "id" = $${paramIdx}`,
    ...values
  );

  return getWebhookById(id) ?? null;
}

export async function deleteWebhook(id: string): Promise<boolean> {
  await ensureTable();
  const result = await prisma.$executeRawUnsafe(
    `DELETE FROM "Webhook" WHERE "id" = $1`,
    id
  );
  // $executeRawUnsafe returns affected row count
  return (result as unknown as number) > 0;
}

// ── Signing ───────────────────────────────────────────────────────────────────

function sign(secret: string, body: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

// ── Fire ──────────────────────────────────────────────────────────────────────

/**
 * Fire a webhook payload to all active webhooks subscribed to the given event.
 * Non-blocking — errors are logged but never thrown.
 */
export async function fireWebhooks(
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<WebhookDeliveryResult[]> {
  let hooks: WebhookConfig[];
  try {
    const all = await getAllWebhooks();
    hooks = all.filter(h => h.active && h.events.includes(event));
  } catch (err) {
    console.error('[webhook] Failed to load webhooks from DB:', err);
    return [];
  }

  if (hooks.length === 0) return [];

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };
  const body = JSON.stringify(payload);

  const results = await Promise.all(
    hooks.map(async (hook): Promise<WebhookDeliveryResult> => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-FixHub-Event': event,
        'X-FixHub-Delivery': crypto.randomUUID(),
      };
      if (hook.secret) {
        headers['X-FixHub-Signature'] = sign(hook.secret, body);
      }

      try {
        const res = await fetch(hook.url, {
          method: 'POST',
          headers,
          body,
          signal: AbortSignal.timeout(10_000),
        });
        console.log(`[webhook] ${event} → ${hook.url} → ${res.status}`);
        return { webhookId: hook.id, url: hook.url, ok: res.ok, status: res.status };
      } catch (err: any) {
        console.error(`[webhook] ${event} → ${hook.url} failed:`, err?.message);
        return { webhookId: hook.id, url: hook.url, ok: false, error: err?.message };
      }
    })
  );

  return results;
}

/**
 * Fire a single test ping to a specific webhook (used by the test endpoint).
 */
export async function testWebhook(hook: WebhookConfig): Promise<WebhookDeliveryResult> {
  const payload: WebhookPayload = {
    event: 'job.status_changed',
    timestamp: new Date().toISOString(),
    data: {
      test: true,
      message: 'This is a test delivery from FixHub.',
    },
  };
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-FixHub-Event': 'job.status_changed',
    'X-FixHub-Delivery': crypto.randomUUID(),
  };
  if (hook.secret) {
    headers['X-FixHub-Signature'] = sign(hook.secret, body);
  }

  try {
    const res = await fetch(hook.url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(10_000),
    });
    return { webhookId: hook.id, url: hook.url, ok: res.ok, status: res.status };
  } catch (err: any) {
    return { webhookId: hook.id, url: hook.url, ok: false, error: err?.message };
  }
}
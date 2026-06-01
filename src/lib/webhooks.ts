/**
 * FixHub Webhook Engine
 *
 * Webhook configurations are stored in the `Webhook` table via Prisma.
 *
 * Supported event types:
 *  - job.status_changed
 *  - part.approved
 *  - part.rejected
 *  - payment.created
 */

import crypto from 'crypto';
import type { Webhook, Prisma } from '@prisma/client';
import { prisma } from './prisma';

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

function rowToConfig(row: Webhook): WebhookConfig {
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
  const rows = await prisma.webhook.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(rowToConfig);
}

export async function getWebhookById(id: string): Promise<WebhookConfig | undefined> {
  const row = await prisma.webhook.findUnique({ where: { id } });
  return row ? rowToConfig(row) : undefined;
}

export async function createWebhook(
  input: Omit<WebhookConfig, 'id' | 'createdAt' | 'updatedAt'>
): Promise<WebhookConfig> {
  const webhook = await prisma.webhook.create({
    data: {
      name: input.name,
      url: input.url,
      secret: input.secret ?? null,
      events: JSON.stringify(input.events),
      active: input.active,
    },
  });
  return rowToConfig(webhook);
}

export async function updateWebhook(
  id: string,
  patch: Partial<Omit<WebhookConfig, 'id' | 'createdAt'>>
): Promise<WebhookConfig | null> {
  const data: Prisma.WebhookUpdateInput = {};
  
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.url !== undefined) data.url = patch.url;
  if ('secret' in patch) data.secret = patch.secret ?? null;
  if (patch.events !== undefined) data.events = JSON.stringify(patch.events);
  if (patch.active !== undefined) data.active = patch.active;

  const webhook = await prisma.webhook.update({
    where: { id },
    data,
  });

  return rowToConfig(webhook);
}

export async function deleteWebhook(id: string): Promise<boolean> {
  const result = await prisma.webhook.delete({
    where: { id },
  });
  return !!result;
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
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[webhook] ${event} → ${hook.url} failed:`, errMsg);
        return { webhookId: hook.id, url: hook.url, ok: false, error: errMsg };
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
  } catch (err) {
    return { webhookId: hook.id, url: hook.url, ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
/**
 * FixHub Webhook Engine
 *
 * Stores webhook configurations in a simple JSON file on the server
 * (process.env.WEBHOOK_STORE_PATH or default `.webhook_store.json`).
 * In production you can swap the persistence layer to a DB table —
 * just replace loadWebhooks / saveWebhooks.
 *
 * Supported event types:
 *  - job.status_changed
 *  - part.approved
 *  - part.rejected
 *  - payment.created
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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
  secret?: string;               // HMAC-SHA256 signing secret
  events: WebhookEvent[];        // which events to fire on
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;             // ISO-8601
  data: Record<string, unknown>;
}

export interface WebhookDeliveryResult {
  webhookId: string;
  url: string;
  ok: boolean;
  status?: number;
  error?: string;
}

// ── Persistence ───────────────────────────────────────────────────────────────

const STORE_PATH =
  process.env.WEBHOOK_STORE_PATH ??
  path.resolve(process.cwd(), '.webhook_store.json');

function loadWebhooks(): WebhookConfig[] {
  try {
    if (!fs.existsSync(STORE_PATH)) return [];
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    return JSON.parse(raw) as WebhookConfig[];
  } catch {
    return [];
  }
}

function saveWebhooks(hooks: WebhookConfig[]): void {
  fs.writeFileSync(STORE_PATH, JSON.stringify(hooks, null, 2), 'utf8');
}

// ── Public CRUD ───────────────────────────────────────────────────────────────

export function getAllWebhooks(): WebhookConfig[] {
  return loadWebhooks();
}

export function getWebhookById(id: string): WebhookConfig | undefined {
  return loadWebhooks().find(h => h.id === id);
}

export function createWebhook(
  input: Omit<WebhookConfig, 'id' | 'createdAt' | 'updatedAt'>
): WebhookConfig {
  const hooks = loadWebhooks();
  const now = new Date().toISOString();
  const hook: WebhookConfig = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  hooks.push(hook);
  saveWebhooks(hooks);
  return hook;
}

export function updateWebhook(
  id: string,
  patch: Partial<Omit<WebhookConfig, 'id' | 'createdAt'>>
): WebhookConfig | null {
  const hooks = loadWebhooks();
  const idx = hooks.findIndex(h => h.id === id);
  if (idx === -1) return null;
  hooks[idx] = { ...hooks[idx], ...patch, updatedAt: new Date().toISOString() };
  saveWebhooks(hooks);
  return hooks[idx];
}

export function deleteWebhook(id: string): boolean {
  const hooks = loadWebhooks();
  const filtered = hooks.filter(h => h.id !== id);
  if (filtered.length === hooks.length) return false;
  saveWebhooks(filtered);
  return true;
}

// ── Signing ───────────────────────────────────────────────────────────────────

function sign(secret: string, body: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

// ── Fire ─────────────────────────────────────────────────────────────────────

/**
 * Fire a webhook payload to all active webhooks subscribed to the given event.
 * Non-blocking — errors are logged but never thrown.
 */
export async function fireWebhooks(
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<WebhookDeliveryResult[]> {
  const hooks = loadWebhooks().filter(h => h.active && h.events.includes(event));
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
          signal: AbortSignal.timeout(10_000), // 10-second timeout
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
export async function testWebhook(
  hook: WebhookConfig
): Promise<WebhookDeliveryResult> {
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
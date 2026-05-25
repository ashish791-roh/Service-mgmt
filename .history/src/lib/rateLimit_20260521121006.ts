/**
 * Rate limiter for Next.js API routes
 *
 * Strategy:
 *  - If UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set,
 *    uses Upstash Redis (shared across all serverless instances / cold starts).
 *  - Otherwise falls back to an in-process module-level singleton that works
 *    fine for local dev or single-instance deployments.
 *
 * The Upstash free tier is sufficient for most small-to-medium deployments.
 * Set the two env vars in Vercel / Railway and the module auto-switches.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
}

export interface RateLimitResult {
  isLimited: boolean;
  remaining: number;
  resetTime: number; // unix ms
  retryAfter: number; // seconds
}

interface RateLimiterAdapter {
  check(identifier: string, config: RateLimitConfig): Promise<RateLimitResult>;
  reset(identifier: string): Promise<void>;
}

// ── In-memory adapter (dev / single-instance) ─────────────────────────────────

interface InMemoryStore {
  [key: string]: number[];
}

class InMemoryRateLimiter implements RateLimiterAdapter {
  private store: InMemoryStore = {};
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Cleanup stale entries every 60 s to prevent unbounded memory growth
    this.cleanupTimer = setInterval(() => this._cleanup(), 60_000);
    // Don't hold the Node.js process open just for this timer
    if (this.cleanupTimer?.unref) this.cleanupTimer.unref();
  }

  async check(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    if (!this.store[identifier]) this.store[identifier] = [];

    // Evict timestamps outside the window
    this.store[identifier] = this.store[identifier].filter(ts => ts > windowStart);

    const isLimited = this.store[identifier].length >= config.maxRequests;

    if (!isLimited) this.store[identifier].push(now);

    const remaining = Math.max(0, config.maxRequests - this.store[identifier].length);
    const resetTime =
      this.store[identifier].length > 0
        ? this.store[identifier][0] + config.windowMs
        : now + config.windowMs;

    return {
      isLimited,
      remaining,
      resetTime,
      retryAfter: Math.ceil((resetTime - now) / 1_000),
    };
  }

  async reset(identifier: string): Promise<void> {
    delete this.store[identifier];
  }

  private _cleanup() {
    const cutoff = Date.now() - 3_600_000; // 1 hour
    for (const [key, timestamps] of Object.entries(this.store)) {
      const fresh = timestamps.filter(ts => ts > cutoff);
      if (fresh.length === 0) delete this.store[key];
      else this.store[key] = fresh;
    }
  }

  destroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }
}

// ── Upstash Redis adapter (serverless / multi-instance) ───────────────────────
//
// Uses the plain REST API so no extra dependency is needed — just two env vars.
// The sliding-window algorithm is implemented with a sorted-set (ZRANGEBYSCORE /
// ZADD / ZREMRANGEBYSCORE) executed as an atomic Lua script via the /pipeline
// endpoint.

class UpstashRateLimiter implements RateLimiterAdapter {
  private readonly url: string;
  private readonly token: string;

  constructor(url: string, token: string) {
    this.url = url.replace(/\/$/, '');
    this.token = token;
  }

  async check(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const key = `rl:${identifier}`;

    // Pipeline: [ZREMRANGEBYSCORE, ZADD, ZCARD, PEXPIRE]
    const pipeline = [
      ['ZREMRANGEBYSCORE', key, '-inf', windowStart.toString()],
      ['ZADD', key, now.toString(), `${now}-${Math.random()}`],
      ['ZCARD', key],
      ['PEXPIRE', key, config.windowMs.toString()],
    ];

    let count = config.maxRequests + 1; // default to "limited" on error
    try {
      const res = await fetch(`${this.url}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pipeline),
      });

      if (res.ok) {
        const results: Array<{ result: number }> = await res.json();
        // results[2] is ZCARD — total entries after adding current request
        count = results[2]?.result ?? count;
      }
    } catch {
      // Network failure: fail open (allow the request) rather than blocking users
      return { isLimited: false, remaining: config.maxRequests, resetTime: now + config.windowMs, retryAfter: 0 };
    }

    const isLimited = count > config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - count);
    const resetTime = now + config.windowMs;

    // If the request was over-limit, undo the ZADD we just did
    if (isLimited) {
      try {
        await fetch(`${this.url}/zremrangebyscore/${encodeURIComponent(key)}/${now}/${now}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${this.token}` },
        });
      } catch { /* best-effort */ }
    }

    return {
      isLimited,
      remaining,
      resetTime,
      retryAfter: Math.ceil(config.windowMs / 1_000),
    };
  }

  async reset(identifier: string): Promise<void> {
    const key = `rl:${identifier}`;
    try {
      await fetch(`${this.url}/del/${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.token}` },
      });
    } catch { /* best-effort */ }
  }
}

// ── Singleton factory ─────────────────────────────────────────────────────────
//
// Using a module-level `let` instead of `globalThis.global.*`  (which throws in
// a clean Node.js process because globalThis.global is undefined).
// The module cache ensures this runs exactly once per process / worker thread.

let _adapter: RateLimiterAdapter | null = null;

function getAdapter(): RateLimiterAdapter {
  if (_adapter) return _adapter;

  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    _adapter = new UpstashRateLimiter(upstashUrl, upstashToken);
  } else {
    _adapter = new InMemoryRateLimiter();
  }

  return _adapter;
}

// ── Public surface ────────────────────────────────────────────────────────────

/**
 * Synchronous-looking wrapper so existing call-sites that use
 * `rateLimiter.check(...)` need only add `await` — no other changes.
 */
export const rateLimiter = {
  check(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    return getAdapter().check(identifier, config);
  },
  reset(identifier: string): Promise<void> {
    return getAdapter().reset(identifier);
  },
};

// ── Pre-configured rate limit tiers ──────────────────────────────────────────

export const RATE_LIMITS = {
  /** 5 attempts per 15 minutes — login brute-force protection */
  LOGIN: { maxRequests: 5, windowMs: 15 * 60 * 1_000 },
  /** 10 requests per 10 minutes — sensitive mutations (user mgmt, webhooks) */
  STRICT: { maxRequests: 10, windowMs: 10 * 60 * 1_000 },
  /** 50 requests per 5 minutes — general API endpoints */
  MODERATE: { maxRequests: 50, windowMs: 5 * 60 * 1_000 },
  /** 100 requests per minute — high-frequency read endpoints */
  LENIENT: { maxRequests: 100, windowMs: 60 * 1_000 },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract the best-guess client IP from common proxy headers. */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return (
    (forwarded ? forwarded.split(',')[0].trim() : null) ??
    request.headers.get('x-real-ip') ??
    request.headers.get('cf-connecting-ip') ??
    'unknown'
  );
}
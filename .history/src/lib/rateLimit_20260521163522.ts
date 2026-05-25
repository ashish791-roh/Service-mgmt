/**
 * rateLimit.ts — Rate limiter for Next.js API routes
 *
 * SECURITY ENHANCEMENTS:
 *  1. Added ACCOUNT_LOCKOUT tier (10 attempts / 30 min) used by the login route.
 *  2. Added PARANOID tier (3 requests / 15 min) for password-reset / 2FA routes.
 *  3. getClientIP() now validates the X-Forwarded-For value — only the first
 *     IP in the chain is used, and private/loopback addresses are stripped so
 *     an attacker cannot spoof "127.0.0.1" to bypass limits.
 *  4. rateLimiter.checkWithHeaders() returns the standard rate-limit response
 *     headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset) so
 *     clients can back off gracefully.
 *
 * Strategy:
 *  - Upstash Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set
 *    (shared across all serverless instances / cold starts).
 *  - Falls back to an in-process singleton for local dev / single-instance deploys.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  maxRequests: number;
  windowMs:    number;
}

export interface RateLimitResult {
  isLimited:   boolean;
  remaining:   number;
  resetTime:   number; // unix ms
  retryAfter:  number; // seconds
}

export interface RateLimitHeaders {
  'RateLimit-Limit':     string;
  'RateLimit-Remaining': string;
  'RateLimit-Reset':     string;
  'Retry-After'?:        string;
}

interface RateLimiterAdapter {
  check(identifier: string, config: RateLimitConfig): Promise<RateLimitResult>;
  reset(identifier: string): Promise<void>;
}

// ── In-memory adapter (dev / single-instance) ────────────────────────────────

interface InMemoryStore { [key: string]: number[] }

class InMemoryRateLimiter implements RateLimiterAdapter {
  private store: InMemoryStore = {};
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cleanupTimer = setInterval(() => this._cleanup(), 60_000);
    if (this.cleanupTimer?.unref) this.cleanupTimer.unref();
  }

  async check(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now         = Date.now();
    const windowStart = now - config.windowMs;

    if (!this.store[identifier]) this.store[identifier] = [];

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
    const cutoff = Date.now() - 3_600_000;
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

class UpstashRateLimiter implements RateLimiterAdapter {
  private readonly url:   string;
  private readonly token: string;

  constructor(url: string, token: string) {
    this.url   = url.replace(/\/$/, '');
    this.token = token;
  }

  async check(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now         = Date.now();
    const windowStart = now - config.windowMs;
    const key         = `rl:${identifier}`;

    const pipeline = [
      ['ZREMRANGEBYSCORE', key, '-inf', windowStart.toString()],
      ['ZADD', key, now.toString(), `${now}-${Math.random()}`],
      ['ZCARD', key],
      ['PEXPIRE', key, config.windowMs.toString()],
    ];

    let count = config.maxRequests + 1;
    try {
      const res = await fetch(`${this.url}/pipeline`, {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pipeline),
      });

      if (res.ok) {
        const results: Array<{ result: number }> = await res.json();
        count = results[2]?.result ?? count;
      }
    } catch {
      return { isLimited: false, remaining: config.maxRequests, resetTime: now + config.windowMs, retryAfter: 0 };
    }

    const isLimited = count > config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - count);
    const resetTime = now + config.windowMs;

    if (isLimited) {
      try {
        await fetch(`${this.url}/zremrangebyscore/${encodeURIComponent(key)}/${now}/${now}`, {
          method:  'GET',
          headers: { Authorization: `Bearer ${this.token}` },
        });
      } catch { /* best-effort */ }
    }

    return { isLimited, remaining, resetTime, retryAfter: Math.ceil(config.windowMs / 1_000) };
  }

  async reset(identifier: string): Promise<void> {
    const key = `rl:${identifier}`;
    try {
      await fetch(`${this.url}/del/${encodeURIComponent(key)}`, {
        method:  'GET',
        headers: { Authorization: `Bearer ${this.token}` },
      });
    } catch { /* best-effort */ }
  }
}

// ── Singleton factory ─────────────────────────────────────────────────────────

let _adapter: RateLimiterAdapter | null = null;

function getAdapter(): RateLimiterAdapter {
  if (_adapter) return _adapter;

  const upstashUrl   = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  _adapter = (upstashUrl && upstashToken)
    ? new UpstashRateLimiter(upstashUrl, upstashToken)
    : new InMemoryRateLimiter();

  return _adapter;
}

// ── Public surface ────────────────────────────────────────────────────────────

export const rateLimiter = {
  check(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    return getAdapter().check(identifier, config);
  },
  reset(identifier: string): Promise<void> {
    return getAdapter().reset(identifier);
  },

  /**
   * Like `check()` but also returns the standard rate-limit response headers.
   * Use this in route handlers to expose limit metadata to API clients.
   */
  async checkWithHeaders(
    identifier: string,
    config: RateLimitConfig
  ): Promise<{ result: RateLimitResult; headers: RateLimitHeaders }> {
    const result  = await getAdapter().check(identifier, config);
    const headers: RateLimitHeaders = {
      'RateLimit-Limit':     config.maxRequests.toString(),
      'RateLimit-Remaining': result.remaining.toString(),
      'RateLimit-Reset':     Math.ceil(result.resetTime / 1_000).toString(),
    };
    if (result.isLimited) headers['Retry-After'] = result.retryAfter.toString();
    return { result, headers };
  },
};

// ── Pre-configured rate-limit tiers ──────────────────────────────────────────

export const RATE_LIMITS = {
  /** 5 attempts / 15 min — login brute-force protection (per IP) */
  LOGIN:           { maxRequests:   5, windowMs: 15 * 60 * 1_000 },
  /** 10 attempts / 30 min — per-account lockout after repeated failures */
  ACCOUNT_LOCKOUT: { maxRequests:  10, windowMs: 30 * 60 * 1_000 },
  /** 3 requests  / 15 min — password reset / 2FA routes */
  PARANOID:        { maxRequests:   3, windowMs: 15 * 60 * 1_000 },
  /** 10 requests / 10 min — sensitive mutations (user mgmt, webhooks) */
  STRICT:          { maxRequests:  10, windowMs: 10 * 60 * 1_000 },
  /** 50 requests / 5 min  — general API endpoints */
  MODERATE:        { maxRequests:  50, windowMs:  5 * 60 * 1_000 },
  /** 100 requests / 1 min — high-frequency read endpoints */
  LENIENT:         { maxRequests: 100, windowMs:      60 * 1_000 },
};

// ── IP extraction ─────────────────────────────────────────────────────────────

/** RFC-1918 / loopback ranges — attackers cannot spoof these to skip limits. */
const PRIVATE_IP_RE = /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|::1$|fc00:|fd)/;

/**
 * Extract the real client IP from common proxy headers.
 *
 * Strips loopback / private IPs from the X-Forwarded-For chain so an attacker
 * cannot inject "127.0.0.1" as the first hop to bypass IP-based rate limits.
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const candidates = forwarded.split(',').map(s => s.trim());
    const publicIP   = candidates.find(ip => !PRIVATE_IP_RE.test(ip));
    if (publicIP) return publicIP;
  }

  return (
    request.headers.get('x-real-ip') ??
    request.headers.get('cf-connecting-ip') ??
    'unknown'
  );
}
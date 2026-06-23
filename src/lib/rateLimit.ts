/**
 * rateLimit.ts — Rate limiter for Next.js API routes
 */

import { Redis } from '@upstash/redis';

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

const _inMemoryAdapter = new InMemoryRateLimiter();

// ── Upstash Redis adapter (serverless / lazy init) ───────────────────────────

let _redisInstance: Redis | null = null;
function getRedis(): Redis | null {
  if (_redisInstance) return _redisInstance;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    _redisInstance = new Redis({ url, token });
  }
  return _redisInstance;
}

class UpstashRateLimiter implements RateLimiterAdapter {
  async check(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const redis = getRedis();
    if (!redis) {
      return _inMemoryAdapter.check(identifier, config);
    }

    const now = Date.now();
    const windowStart = now - config.windowMs;
    const windowStartSec = Math.floor(now / 1000);
    const key = `rl:${identifier}:${windowStartSec}`;
    const memberId = `${now}-${Math.random()}`;

    try {
      const p = redis.pipeline();
      p.zremrangebyscore(key, '-inf', windowStart);
      p.zadd(key, { score: now, member: memberId });
      p.zcard(key);
      p.pexpire(key, Math.ceil(config.windowMs / 1000));
      const results = await p.exec();

      const count = (results[2] as number) ?? 1;
      const isLimited = count > config.maxRequests;
      const remaining = Math.max(0, config.maxRequests - count);
      const resetTime = now + config.windowMs;

      return {
        isLimited,
        remaining,
        resetTime,
        retryAfter: Math.ceil(config.windowMs / 1000),
      };
    } catch (err) {
      console.error('[Upstash Rate Limiter Error]', err);
      return _inMemoryAdapter.check(identifier, config);
    }
  }

  async reset(identifier: string): Promise<void> {
    const redis = getRedis();
    if (!redis) {
      await _inMemoryAdapter.reset(identifier);
      return;
    }
    const now = Date.now();
    const windowStartSec = Math.floor(now / 1000);
    const key = `rl:${identifier}:${windowStartSec}`;
    try {
      await redis.del(key);
    } catch {}
  }
}

// ── Singleton factory ─────────────────────────────────────────────────────────

let _adapter: RateLimiterAdapter | null = null;

function getAdapter(): RateLimiterAdapter {
  if (_adapter) return _adapter;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  _adapter = (url && token)
    ? new UpstashRateLimiter()
    : _inMemoryAdapter;

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
  /** 30 requests / 1 min — sensitive read endpoints like /api/audit-logs */
  STRICT_API:      { maxRequests:  30, windowMs: 60 * 1_000 },
  /** 50 requests / 5 min  — general API endpoints */
  MODERATE:        { maxRequests:  50, windowMs:  5 * 60 * 1_000 },
  /** 100 requests / 1 min — high-frequency read endpoints */
  LENIENT:         { maxRequests: 100, windowMs:      60 * 1_000 },
};

// ── IP extraction ─────────────────────────────────────────────────────────────

const PRIVATE_IP_RE = /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|::1$|fc00:|fd)/;

/**
 * Extract the real client IP from common proxy headers.
 */
export function getClientIP(request: Request, route?: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  let ip = 'unknown';
  if (forwarded) {
    const candidates = forwarded.split(',').map(s => s.trim());
    const publicIP   = candidates.find(ip => !PRIVATE_IP_RE.test(ip));
    if (publicIP) ip = publicIP;
  } else {
    ip = (
      request.headers.get('x-real-ip') ??
      request.headers.get('cf-connecting-ip') ??
      'unknown'
    );
  }
  return route ? `${ip}:${route}` : ip;
}
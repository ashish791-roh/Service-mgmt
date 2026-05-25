/**
 * Simple in-memory rate limiter for Next.js API routes
 * Prevents brute-force attacks and API abuse
 */

interface RateLimitStore {
  [key: string]: number[];
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
}

class RateLimiter {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup old entries every minute to prevent memory leaks
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if request should be rate limited
   * @param identifier - Unique identifier (e.g., IP + endpoint, or email)
   * @param config - Rate limit configuration
   * @returns Object with isLimited boolean and remaining requests
   */
  check(identifier: string, config: RateLimitConfig) {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Initialize or get existing timestamps for this identifier
    if (!this.store[identifier]) {
      this.store[identifier] = [];
    }

    // Remove timestamps outside the current window
    this.store[identifier] = this.store[identifier].filter(
      (timestamp) => timestamp > windowStart
    );

    // Check if limit exceeded
    const isLimited = this.store[identifier].length >= config.maxRequests;

    if (!isLimited) {
      // Record this request
      this.store[identifier].push(now);
    }

    const remaining = Math.max(
      0,
      config.maxRequests - this.store[identifier].length
    );
    const resetTime = this.store[identifier].length > 0
      ? this.store[identifier][0] + config.windowMs
      : now + config.windowMs;

    return {
      isLimited,
      remaining,
      resetTime,
      retryAfter: Math.ceil((resetTime - now) / 1000), // seconds
    };
  }

  /**
   * Reset rate limit for a specific identifier
   */
  reset(identifier: string) {
    delete this.store[identifier];
  }

  /**
   * Clean up old entries to prevent memory leaks
   */
  private cleanup() {
    const now = Date.now();
    const maxAge = 3600000; // Keep entries for max 1 hour

    for (const [key, timestamps] of Object.entries(this.store)) {
      // Remove identifiers with no recent activity
      const recentTimestamps = timestamps.filter(
        (timestamp) => now - timestamp < maxAge
      );

      if (recentTimestamps.length === 0) {
        delete this.store[key];
      } else {
        this.store[key] = recentTimestamps;
      }
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Global rate limiter instance
const globalRateLimiter = new globalThis.global.rateLimiter || new RateLimiter();
if (typeof globalThis !== 'undefined') {
  (globalThis as any).rateLimiter = globalRateLimiter;
}

export const rateLimiter = globalRateLimiter;

/**
 * Pre-configured rate limit configs
 */
export const RATE_LIMITS = {
  // Login: 5 attempts per 15 minutes per email/IP
  LOGIN: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
  },
  // Strict: 10 requests per 10 minutes (for sensitive operations)
  STRICT: {
    maxRequests: 10,
    windowMs: 10 * 60 * 1000,
  },
  // Moderate: 50 requests per 5 minutes (for general API endpoints)
  MODERATE: {
    maxRequests: 50,
    windowMs: 5 * 60 * 1000,
  },
  // Lenient: 100 requests per 1 minute (for non-critical operations)
  LENIENT: {
    maxRequests: 100,
    windowMs: 1 * 60 * 1000,
  },
};

/**
 * Get client IP address from request
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded
    ? forwarded.split(',')[0].trim()
    : request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      'unknown';
  return ip;
}

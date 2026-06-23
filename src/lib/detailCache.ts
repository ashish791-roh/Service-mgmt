/**
 * detailCache.ts — lightweight in-memory request cache with TTL.
 *
 * Eliminates redundant fetches when a user opens the same detail panel
 * multiple times in one session (e.g. opens a job, closes it, reopens it).
 */

interface CacheEntry<T> {
  data: T;
  createdAt: number;
  ttlMs: number;
  staleMs?: number;
  expiresAt: number;
  staleAt?: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 60_000; // 1 minute
const MAX_CACHE_ENTRIES = 200;

let hits = 0;
let misses = 0;

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) {
    misses++;
    return null;
  }

  const now = Date.now();
  const isStale = now > entry.expiresAt;
  const isExpired = entry.staleAt ? now > entry.staleAt : isStale;

  if (isExpired) {
    cache.delete(key);
    misses++;
    return null;
  }

  hits++;

  if (isStale) {
    // Stale but younger than staleMs: trigger background revalidation
    if (key.startsWith('/') || key.startsWith('http')) {
      fetch(key, { credentials: 'same-origin' })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            setCached(key, data, entry.ttlMs, entry.staleMs);
          }
        })
        .catch((err) => console.error('[SWR background revalidate error]', err));
    }
  }

  return entry.data as T;
}

export function setCached<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS, staleMs?: number): void {
  const now = Date.now();
  const expiresAt = now + ttlMs;
  const staleAt = staleMs ? now + staleMs : undefined;

  cache.set(key, {
    data,
    createdAt: now,
    ttlMs,
    staleMs,
    expiresAt,
    staleAt,
  });

  if (cache.size > MAX_CACHE_ENTRIES) {
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    const toEvict = Math.ceil(MAX_CACHE_ENTRIES * 0.2);
    for (let i = 0; i < toEvict; i++) {
      if (entries[i]) {
        cache.delete(entries[i][0]);
      }
    }
  }
}

export function invalidateCache(keyPrefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(keyPrefix)) cache.delete(key);
  }
}

/**
 * Fetch with cache: returns cached data instantly if available,
 * otherwise fetches and caches the result.
 */
export async function cachedFetch<T>(
  url: string,
  ttlMs = DEFAULT_TTL_MS,
  signal?: AbortSignal
): Promise<T | null> {
  const cached = getCached<T>(url);
  if (cached !== null) return cached;

  try {
    const res = await fetch(url, { credentials: 'same-origin', signal });
    if (!res.ok) return null;
    const data: T = await res.json();
    setCached(url, data, ttlMs);
    return data;
  } catch (err: any) {
    if (err.name === 'AbortError') return null;
    console.error('[cachedFetch]', url, err);
    return null;
  }
}

/**
 * Prefetch a list of URLs sequentially with a 50ms gap between each,
 * skipping already-cached ones.
 */
export function prefetchQueue(urls: string[], ttlMs?: number): void {
  (async () => {
    for (const url of urls) {
      if (cache.has(url)) continue;
      try {
        await cachedFetch(url, ttlMs);
      } catch (err) {
        console.error('[prefetchQueue error]', url, err);
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  })();
}

/**
 * Get cache metrics (dev only)
 */
export function getCacheStats() {
  const total = hits + misses;
  const hitRate = total > 0 ? `${((hits / total) * 100).toFixed(1)}%` : '0.0%';
  return {
    size: cache.size,
    hits,
    misses,
    hitRate,
  };
}

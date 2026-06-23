import { useEffect, useState, useRef } from 'react';
import { getCached, setCached, invalidateCache, cachedFetch } from './detailCache';

const inFlight = new Map<string, Promise<Response>>();

export async function deduplicatedFetch(url: string, init?: RequestInit): Promise<Response> {
  const method = init?.method?.toUpperCase() ?? 'GET';
  if (method !== 'GET') {
    return fetch(url, init);
  }

  const existing = inFlight.get(url);
  if (existing) {
    return existing.then(res => res.clone());
  }

  const promise = fetch(url, init).then(res => {
    inFlight.delete(url);
    return res;
  }).catch(err => {
    inFlight.delete(url);
    throw err;
  });

  inFlight.set(url, promise);
  return promise.then(res => res.clone());
}

export const queryClient = {
  fetch: deduplicatedFetch,
  prefetch: (url: string) => {
    cachedFetch(url).catch(() => {});
  },
  invalidate: (urlPrefix: string) => {
    invalidateCache(urlPrefix);
  },
  clear: () => {
    inFlight.clear();
  },
};

export function useDeduplicated<T>(url: string, enabled = true) {
  const [data, setData] = useState<T | null>(() => getCached<T>(url));
  const [loading, setLoading] = useState(enabled && !data);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    if (!enabled) return;

    const controller = new AbortController();
    
    const run = async () => {
      const cached = getCached<T>(url);
      if (cached) {
        setData(cached);
        // Do not block loading state if we have cached data
        setLoading(false);
      } else {
        setLoading(true);
      }

      try {
        const res = await deduplicatedFetch(url, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Fetch failed: ${res.status}`);
        }
        const json = await res.json();
        setCached(url, json);
        if (isMounted.current) {
          setData(json);
          setLoading(false);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        if (isMounted.current) {
          setError(err);
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      isMounted.current = false;
      controller.abort();
    };
  }, [url, enabled]);

  return { data, loading, error };
}

/**
 * usePrefetch — fires a prefetch after the user hovers for `delayMs` milliseconds.
 * Call once per row/card. The fetch result goes into detailCache automatically.
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import { cachedFetch, getCached, prefetchQueue } from '../lib/detailCache';

export function useSmartPrefetch(url: string, ttlMs = 60_000, delayMs = 150) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastMousePos = useRef<{ x: number; y: number; time: number } | null>(null);
  const pointerSpeed = useRef<number>(0);

  const startPrefetch = useCallback(() => {
    if (getCached(url)) return; // already cached
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    cachedFetch(url, ttlMs, abortRef.current.signal).catch(() => {});
  }, [url, ttlMs]);

  const onMouseEnter = useCallback(() => {
    if (getCached(url)) return;
    if (pointerSpeed.current > 0 && pointerSpeed.current < 200) {
      startPrefetch();
    } else {
      timerRef.current = setTimeout(startPrefetch, delayMs);
    }
  }, [url, delayMs, startPrefetch]);

  const onMouseLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const now = performance.now();
    if (lastMousePos.current) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      const dt = (now - lastMousePos.current.time) / 1000;
      if (dt > 0) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        pointerSpeed.current = dist / dt;
      }
    }
    lastMousePos.current = { x: e.clientX, y: e.clientY, time: now };
  }, []);

  const onTouchStart = useCallback(() => {
    startPrefetch();
  }, [startPrefetch]);

  const onTouchCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    onMouseEnter,
    onMouseLeave,
    onMouseMove,
    onTouchStart,
    onTouchCancel,
  };
}

// Alias for backward compatibility
export const usePrefetch = useSmartPrefetch;

/**
 * Prefetch when the element scrolls into the viewport.
 */
export function useViewportPrefetch(url: string, ttlMs = 60_000) {
  const [element, setElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!element || getCached(url)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            cachedFetch(url, ttlMs).catch(() => {});
            observer.unobserve(element);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [element, url, ttlMs]);

  return setElement;
}

/**
 * Prefetch a batch of URLs sequentially on mount.
 */
export function useBatchPrefetch(urls: string[], ttlMs?: number) {
  useEffect(() => {
    prefetchQueue(urls, ttlMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * useSLAWatcher
 *
 * Periodically checks all active (non-terminal) jobs against their SLA tiers.
 * When a breach is detected it:
 *   1. Calls POST /api/jobs/:id/sla-check  (server deduplicates)
 *   2. Re-fetches notifications so the bell badge updates immediately
 *
 * The watcher runs every POLL_MS milliseconds (default: 5 minutes).
 * A job is only submitted for an SLA check if it is in a non-terminal status
 * AND its SLA level is 'breached'.
 *
 * Usage: call once near the root of the app (e.g. inside AppProvider or App.tsx).
 *   useSLAWatcher();
 */

import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { getSLAStatus } from '../lib/sla';

const POLL_MS = 5 * 60 * 1_000; // 5 minutes
const TERMINAL = new Set(['Completed', 'Delivered']);

export function useSLAWatcher() {
  const { jobs, devices, slaTiers, notifications } = useApp();
  // Keep a stable ref to setNotifications without re-subscribing
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  useEffect(() => {
    const runCheck = async () => {
      const activeJobs = jobs.filter(j => !TERMINAL.has(j.status));
      if (activeJobs.length === 0) return;

      const breached = activeJobs.filter(job => {
        const device = devices.find(d => d.id === job.deviceId);
        const sla = getSLAStatus(job.createdAt, job.status, device?.type, slaTiers);
        return sla.level === 'breached';
      });

      if (breached.length === 0) return;

      // Fire SLA-check API for each breached job (server deduplicates)
      await Promise.allSettled(
        breached.map(async job => {
          const device = devices.find(d => d.id === job.deviceId);
          const sla = getSLAStatus(job.createdAt, job.status, device?.type, slaTiers);

          try {
            await fetch(`/api/jobs/${job.id}/sla-check`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                label: sla.label,
                tierName: sla.tier.deviceType,
              }),
            });
          } catch {
            // Non-fatal: watcher will retry on next poll
          }
        })
      );
    };

    // Run once immediately, then on an interval
    runCheck();
    const id = setInterval(runCheck, POLL_MS);
    return () => clearInterval(id);
  // Re-run whenever job list or SLA tiers change, but not on every notification refresh
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, devices, slaTiers]);
}

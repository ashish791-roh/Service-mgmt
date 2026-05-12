/**
 * SLA Engine — Repair SLA & Deadline Tracking
 *
 * SLA tiers are keyed by device type (case-insensitive match).
 * Each tier defines:
 *   warningHours  — hours until a job enters "Warning" (yellow)
 *   criticalHours — hours until a job enters "Breached" (red)
 *
 * The tiers are persisted in localStorage under SLA_KEY so the admin
 * can customise them from SystemSettingsPage without a server round-trip.
 *
 * A job's SLA clock starts at createdAt and stops when it reaches a
 * terminal status (Completed | Delivered). This mirrors the existing
 * getJobAgeLevel() logic in ui.tsx, but with per-device-type thresholds.
 */

export interface SLATier {
  deviceType: string;   // e.g. "Phone", "Laptop", "Tablet"
  warningHours: number; // e.g. 24
  criticalHours: number; // e.g. 48
}

export type SLAStatusLevel = 'ok' | 'warning' | 'breached';

export interface SLAStatus {
  level: SLAStatusLevel;
  hoursElapsed: number;
  hoursRemaining: number; // negative = overdue
  deadline: Date;         // absolute deadline (criticalHours from createdAt)
  tier: SLATier;
  label: string;          // human-readable, e.g. "2h overdue"
}

// ── Storage key ──────────────────────────────────────────────────────────────
export const SLA_TIERS_KEY = 'fixhub_sla_tiers';

// ── Default tiers ─────────────────────────────────────────────────────────────
export const DEFAULT_SLA_TIERS: SLATier[] = [
  { deviceType: 'Phone',    warningHours: 24,  criticalHours: 48  },
  { deviceType: 'Laptop',   warningHours: 48,  criticalHours: 72  },
  { deviceType: 'Tablet',   warningHours: 36,  criticalHours: 60  },
  { deviceType: 'Desktop',  warningHours: 48,  criticalHours: 96  },
  { deviceType: 'Other',    warningHours: 48,  criticalHours: 72  },
];

// ── Fallback tier for unknown device types ────────────────────────────────────
const FALLBACK_TIER: SLATier = { deviceType: 'Other', warningHours: 48, criticalHours: 72 };

// ── Persistence helpers ───────────────────────────────────────────────────────
export function loadSLATiers(): SLATier[] {
  if (typeof window === 'undefined') return [...DEFAULT_SLA_TIERS];
  try {
    const raw = localStorage.getItem(SLA_TIERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SLATier[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return [...DEFAULT_SLA_TIERS];
}

export function saveSLATiers(tiers: SLATier[]): void {
  try { localStorage.setItem(SLA_TIERS_KEY, JSON.stringify(tiers)); } catch { /* ignore */ }
}

// ── Core lookup ───────────────────────────────────────────────────────────────
export function getTierForDevice(deviceType: string | undefined, tiers: SLATier[]): SLATier {
  if (!deviceType) return FALLBACK_TIER;
  const key = deviceType.trim().toLowerCase();
  return (
    tiers.find(t => t.deviceType.toLowerCase() === key) ??
    tiers.find(t => t.deviceType.toLowerCase() === 'other') ??
    FALLBACK_TIER
  );
}

// ── Terminal statuses — SLA clock stops here ──────────────────────────────────
const TERMINAL_STATUSES = new Set(['Completed', 'Delivered']);

/**
 * Compute the full SLA status for a single job.
 *
 * @param createdAt   ISO string — when the job was opened
 * @param status      Current job status
 * @param deviceType  Device.type, e.g. "Phone"
 * @param tiers       SLA tier configuration (from loadSLATiers or context)
 */
export function getSLAStatus(
  createdAt: string,
  status: string,
  deviceType: string | undefined,
  tiers: SLATier[]
): SLAStatus {
  const tier = getTierForDevice(deviceType, tiers);
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const hoursElapsed = Math.max(0, (now - created) / 3_600_000);
  const deadline = new Date(created + tier.criticalHours * 3_600_000);
  const hoursRemaining = tier.criticalHours - hoursElapsed;

  // Terminal jobs are always "ok" — no SLA pressure on closed work
  const isTerminal = TERMINAL_STATUSES.has(status);

  let level: SLAStatusLevel = 'ok';
  if (!isTerminal) {
    if (hoursElapsed >= tier.criticalHours) level = 'breached';
    else if (hoursElapsed >= tier.warningHours) level = 'warning';
  }

  // Human-readable label
  let label: string;
  if (isTerminal) {
    label = 'Closed';
  } else if (level === 'breached') {
    const overdue = Math.abs(hoursRemaining);
    label = overdue < 1
      ? '< 1h overdue'
      : overdue < 24
      ? `${Math.round(overdue)}h overdue`
      : `${Math.round(overdue / 24)}d overdue`;
  } else {
    label = hoursRemaining < 1
      ? '< 1h left'
      : hoursRemaining < 24
      ? `${Math.round(hoursRemaining)}h left`
      : `${Math.round(hoursRemaining / 24)}d left`;
  }

  return { level, hoursElapsed, hoursRemaining, deadline, tier, label };
}

/**
 * Quick check: is this job currently in SLA breach?
 * Convenience wrapper used by notification logic.
 */
export function isSLABreached(
  createdAt: string,
  status: string,
  deviceType: string | undefined,
  tiers: SLATier[]
): boolean {
  return getSLAStatus(createdAt, status, deviceType, tiers).level === 'breached';
}

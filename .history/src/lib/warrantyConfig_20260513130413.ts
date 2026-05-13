/**
 * warrantyConfig.ts
 *
 * Manages warranty duration settings per device type.
 * Stored in localStorage under 'fixhub_warranty_config'.
 *
 * Each entry maps a device type (e.g. "Phone", "Laptop") to a warranty
 * duration in days. A duration of 0 means no warranty is issued for that type.
 */

export interface WarrantyEntry {
  deviceType: string;   // e.g. "Phone", "Laptop"
  days: number;         // warranty duration in days; 0 = no warranty
}

const WARRANTY_KEY = 'fixhub_warranty_config';

export const DEFAULT_WARRANTY_ENTRIES: WarrantyEntry[] = [
  { deviceType: 'Phone',   days: 30  },
  { deviceType: 'Laptop',  days: 60  },
  { deviceType: 'Tablet',  days: 45  },
  { deviceType: 'Desktop', days: 90  },
  { deviceType: 'Other',   days: 30  },
];

export function loadWarrantyConfig(): WarrantyEntry[] {
  if (typeof window === 'undefined') return [...DEFAULT_WARRANTY_ENTRIES];
  try {
    const raw = localStorage.getItem(WARRANTY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WarrantyEntry[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return [...DEFAULT_WARRANTY_ENTRIES];
}

export function saveWarrantyConfig(entries: WarrantyEntry[]): void {
  try {
    localStorage.setItem(WARRANTY_KEY, JSON.stringify(entries));
  } catch { /* ignore */ }
}

/** Get the warranty duration (days) for a given device type. */
export function getWarrantyDays(
  deviceType: string | undefined,
  entries: WarrantyEntry[]
): number {
  if (!deviceType) return 0;
  const key = deviceType.trim().toLowerCase();
  const match =
    entries.find(e => e.deviceType.toLowerCase() === key) ??
    entries.find(e => e.deviceType.toLowerCase() === 'other');
  return match?.days ?? 0;
}

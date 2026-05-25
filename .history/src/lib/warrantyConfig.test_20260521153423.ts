import { describe, expect, it } from '@vitest/globals';
import { DEFAULT_WARRANTY_ENTRIES, getWarrantyDays } from './warrantyConfig';

describe('Warranty configuration', () => {
  it('returns the configured days for a known device type', () => {
    expect(getWarrantyDays('Laptop', DEFAULT_WARRANTY_ENTRIES)).toBe(60);
  });

  it('matches device types case-insensitively', () => {
    expect(getWarrantyDays('pHoNe', DEFAULT_WARRANTY_ENTRIES)).toBe(30);
  });

  it('returns fallback days for unknown device types', () => {
    expect(getWarrantyDays('Smartwatch', DEFAULT_WARRANTY_ENTRIES)).toBe(30);
  });

  it('returns 0 when device type is undefined', () => {
    expect(getWarrantyDays(undefined, DEFAULT_WARRANTY_ENTRIES)).toBe(0);
  });
});

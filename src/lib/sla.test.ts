import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { DEFAULT_SLA_TIERS, getSLAStatus, getTierForDevice, isSLABreached } from './sla';

const FIXED_NOW = new Date('2026-05-21T12:00:00.000Z');

describe('SLA logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('selects a matching tier case-insensitively', () => {
    const tier = getTierForDevice('lApToP', DEFAULT_SLA_TIERS);
    expect(tier.deviceType).toBe('Laptop');
  });

  it('falls back to "Other" for unknown device types', () => {
    const tier = getTierForDevice('Smartwatch', DEFAULT_SLA_TIERS);
    expect(tier.deviceType).toBe('Other');
  });

  it('returns ok status for active jobs before warning threshold', () => {
    const createdAt = new Date(FIXED_NOW.getTime() - 10 * 60 * 60 * 1000).toISOString();
    const status = getSLAStatus(createdAt, 'In Progress', 'Phone', DEFAULT_SLA_TIERS);

    expect(status.level).toBe('ok');
    expect(status.label).toBe('2d left');
    expect(status.hoursRemaining).toBeCloseTo(38, 1);
  });

  it('returns warning status once warning threshold is crossed', () => {
    const createdAt = new Date(FIXED_NOW.getTime() - 30 * 60 * 60 * 1000).toISOString();
    const status = getSLAStatus(createdAt, 'In Progress', 'Phone', DEFAULT_SLA_TIERS);

    expect(status.level).toBe('warning');
    expect(status.label).toBe('18h left');
  });

  it('returns breached status when SLA is overdue', () => {
    const createdAt = new Date(FIXED_NOW.getTime() - 52 * 60 * 60 * 1000).toISOString();
    const status = getSLAStatus(createdAt, 'In Progress', 'Phone', DEFAULT_SLA_TIERS);

    expect(status.level).toBe('breached');
    expect(status.label).toBe('4h overdue');
  });

  it('always returns Closed for terminal statuses', () => {
    const createdAt = new Date(FIXED_NOW.getTime() - 100 * 60 * 60 * 1000).toISOString();
    const status = getSLAStatus(createdAt, 'Completed', 'Phone', DEFAULT_SLA_TIERS);

    expect(status.level).toBe('ok');
    expect(status.label).toBe('Closed');
  });

  it('reports breach via isSLABreached helper', () => {
    const createdAt = new Date(FIXED_NOW.getTime() - 60 * 60 * 60 * 1000).toISOString();
    expect(isSLABreached(createdAt, 'In Progress', 'Phone', DEFAULT_SLA_TIERS)).toBe(true);
    expect(isSLABreached(createdAt, 'Completed', 'Phone', DEFAULT_SLA_TIERS)).toBe(false);
  });
});

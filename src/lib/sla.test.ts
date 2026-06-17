import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  DEFAULT_SLA_TIERS,
  getSLAStatus,
  getTierForDevice,
  isSLABreached,
  loadSLATiers,
  saveSLATiers,
  fetchSLATiersFromAPI,
  saveSLATiersToAPI
} from './sla';

const FIXED_NOW = new Date('2026-05-21T12:00:00.000Z');

describe('SLA logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
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

  describe('localStorage persistence', () => {
    it('loadSLATiers should return defaults when window is undefined', () => {
      // By default in Node context without stubbing window, it should be undefined or we can force it
      vi.stubGlobal('window', undefined);
      const tiers = loadSLATiers();
      expect(tiers).toEqual(DEFAULT_SLA_TIERS);
    });

    it('loadSLATiers should return defaults when localStorage is empty or throws', () => {
      const mockLocalStorage = {
        getItem: vi.fn().mockImplementation(() => {
          throw new Error('Storage disabled');
        }),
        setItem: vi.fn(),
      };
      vi.stubGlobal('window', {});
      vi.stubGlobal('localStorage', mockLocalStorage);

      const tiers = loadSLATiers();
      expect(tiers).toEqual(DEFAULT_SLA_TIERS);
    });

    it('loadSLATiers should load valid JSON from localStorage', () => {
      const customTiers = [{ deviceType: 'Laptop', warningHours: 10, criticalHours: 20 }];
      const mockLocalStorage = {
        getItem: vi.fn().mockReturnValue(JSON.stringify(customTiers)),
        setItem: vi.fn(),
      };
      vi.stubGlobal('window', {});
      vi.stubGlobal('localStorage', mockLocalStorage);

      const tiers = loadSLATiers();
      expect(tiers).toEqual(customTiers);
    });

    it('saveSLATiers should save to localStorage', () => {
      const customTiers = [{ deviceType: 'Laptop', warningHours: 10, criticalHours: 20 }];
      const mockLocalStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
      };
      vi.stubGlobal('window', {});
      vi.stubGlobal('localStorage', mockLocalStorage);

      saveSLATiers(customTiers);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('fixhub_sla_tiers', JSON.stringify(customTiers));
    });
  });

  describe('API Config Sync', () => {
    it('fetchSLATiersFromAPI should fetch and save to localStorage on success', async () => {
      const apiTiers = [{ deviceType: 'Phone', warningHours: 5, criticalHours: 10 }];
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => apiTiers,
      });
      vi.stubGlobal('fetch', fetchMock);

      const mockLocalStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
      };
      vi.stubGlobal('window', {});
      vi.stubGlobal('localStorage', mockLocalStorage);

      const result = await fetchSLATiersFromAPI();
      expect(result).toEqual(apiTiers);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('fixhub_sla_tiers', JSON.stringify(apiTiers));
    });

    it('fetchSLATiersFromAPI should fall back to localStorage/defaults on error', async () => {
      const consoleMock = vi.spyOn(console, 'error').mockImplementation(() => {});
      const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.stubGlobal('fetch', fetchMock);

      const result = await fetchSLATiersFromAPI();
      expect(result).toEqual(DEFAULT_SLA_TIERS);
      expect(consoleMock).toHaveBeenCalled();
      consoleMock.mockRestore();
    });

    it('saveSLATiersToAPI should PUT tiers and return success', async () => {
      const inputTiers = [{ deviceType: 'Phone', warningHours: 5, criticalHours: 10 }];
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ tiers: inputTiers }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const mockLocalStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
      };
      vi.stubGlobal('window', {});
      vi.stubGlobal('localStorage', mockLocalStorage);

      const result = await saveSLATiersToAPI(inputTiers);
      expect(result).toEqual({ ok: true });
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('fixhub_sla_tiers', JSON.stringify(inputTiers));
    });

    it('saveSLATiersToAPI should handle API validation error responses', async () => {
      const inputTiers = [{ deviceType: 'Phone', warningHours: 5, criticalHours: 10 }];
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Invalid config' }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const result = await saveSLATiersToAPI(inputTiers);
      expect(result).toEqual({ ok: false, error: 'Invalid config' });
    });

    it('saveSLATiersToAPI should handle network errors gracefully', async () => {
      const consoleMock = vi.spyOn(console, 'error').mockImplementation(() => {});
      const inputTiers = [{ deviceType: 'Phone', warningHours: 5, criticalHours: 10 }];
      const fetchMock = vi.fn().mockRejectedValue(new Error('Timeout'));
      vi.stubGlobal('fetch', fetchMock);

      const result = await saveSLATiersToAPI(inputTiers);
      expect(result).toEqual({ ok: false, error: 'Network error' });
      expect(consoleMock).toHaveBeenCalled();
      consoleMock.mockRestore();
    });
  });
});

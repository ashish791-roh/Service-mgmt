import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  DEFAULT_WARRANTY_ENTRIES,
  getWarrantyDays,
  loadWarrantyConfig,
  saveWarrantyConfig,
  fetchWarrantyConfigFromAPI,
  saveWarrantyConfigToAPI
} from './warrantyConfig';

describe('Warranty configuration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  describe('localStorage persistence', () => {
    it('loadWarrantyConfig should return defaults when window is undefined', () => {
      vi.stubGlobal('window', undefined);
      const config = loadWarrantyConfig();
      expect(config).toEqual(DEFAULT_WARRANTY_ENTRIES);
    });

    it('loadWarrantyConfig should return defaults when localStorage is empty or throws', () => {
      const mockLocalStorage = {
        getItem: vi.fn().mockImplementation(() => {
          throw new Error('Storage disabled');
        }),
        setItem: vi.fn(),
      };
      vi.stubGlobal('window', {});
      vi.stubGlobal('localStorage', mockLocalStorage);

      const config = loadWarrantyConfig();
      expect(config).toEqual(DEFAULT_WARRANTY_ENTRIES);
    });

    it('loadWarrantyConfig should load valid JSON from localStorage', () => {
      const customEntries = [{ deviceType: 'Laptop', days: 15 }];
      const mockLocalStorage = {
        getItem: vi.fn().mockReturnValue(JSON.stringify(customEntries)),
        setItem: vi.fn(),
      };
      vi.stubGlobal('window', {});
      vi.stubGlobal('localStorage', mockLocalStorage);

      const config = loadWarrantyConfig();
      expect(config).toEqual(customEntries);
    });

    it('saveWarrantyConfig should save to localStorage', () => {
      const customEntries = [{ deviceType: 'Laptop', days: 15 }];
      const mockLocalStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
      };
      vi.stubGlobal('window', {});
      vi.stubGlobal('localStorage', mockLocalStorage);

      saveWarrantyConfig(customEntries);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('fixhub_warranty_config', JSON.stringify(customEntries));
    });
  });

  describe('API Config Sync and CSRF', () => {
    it('fetchWarrantyConfigFromAPI should fetch and save on success', async () => {
      const apiEntries = [{ deviceType: 'Phone', days: 10 }];
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => apiEntries,
      });
      vi.stubGlobal('fetch', fetchMock);

      const mockLocalStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
      };
      vi.stubGlobal('window', {});
      vi.stubGlobal('localStorage', mockLocalStorage);

      const result = await fetchWarrantyConfigFromAPI();
      expect(result).toEqual(apiEntries);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('fixhub_warranty_config', JSON.stringify(apiEntries));
    });

    it('fetchWarrantyConfigFromAPI should fall back to localStorage/defaults on error', async () => {
      const consoleMock = vi.spyOn(console, 'error').mockImplementation(() => {});
      const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.stubGlobal('fetch', fetchMock);

      const result = await fetchWarrantyConfigFromAPI();
      expect(result).toEqual(DEFAULT_WARRANTY_ENTRIES);
      expect(consoleMock).toHaveBeenCalled();
      consoleMock.mockRestore();
    });

    it('saveWarrantyConfigToAPI should PUT with CSRF header and return success', async () => {
      const inputEntries = [{ deviceType: 'Phone', days: 10 }];
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ entries: inputEntries }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const mockLocalStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
      };
      vi.stubGlobal('window', {});
      vi.stubGlobal('localStorage', mockLocalStorage);
      vi.stubGlobal('document', { cookie: 'fixhub_csrf=mock-csrf-token' });

      const result = await saveWarrantyConfigToAPI(inputEntries);
      expect(result).toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledWith('/api/warranty-config', expect.objectContaining({
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': 'mock-csrf-token',
        },
      }));
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('fixhub_warranty_config', JSON.stringify(inputEntries));
    });

    it('saveWarrantyConfigToAPI should handle missing CSRF cookie gracefully', async () => {
      const inputEntries = [{ deviceType: 'Phone', days: 10 }];
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ entries: inputEntries }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const mockLocalStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
      };
      vi.stubGlobal('window', {});
      vi.stubGlobal('localStorage', mockLocalStorage);
      vi.stubGlobal('document', { cookie: '' });

      const result = await saveWarrantyConfigToAPI(inputEntries);
      expect(result).toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledWith('/api/warranty-config', expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': '',
        },
      }));
    });

    it('saveWarrantyConfigToAPI should return error on non-ok status', async () => {
      const inputEntries = [{ deviceType: 'Phone', days: 10 }];
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Access denied' }),
      });
      vi.stubGlobal('fetch', fetchMock);
      vi.stubGlobal('document', { cookie: '' });

      const result = await saveWarrantyConfigToAPI(inputEntries);
      expect(result).toEqual({ ok: false, error: 'Access denied' });
    });

    it('saveWarrantyConfigToAPI should return error on throw', async () => {
      const consoleMock = vi.spyOn(console, 'error').mockImplementation(() => {});
      const inputEntries = [{ deviceType: 'Phone', days: 10 }];
      const fetchMock = vi.fn().mockRejectedValue(new Error('Network failure'));
      vi.stubGlobal('fetch', fetchMock);
      vi.stubGlobal('document', { cookie: '' });

      const result = await saveWarrantyConfigToAPI(inputEntries);
      expect(result).toEqual({ ok: false, error: 'Network error' });
      expect(consoleMock).toHaveBeenCalled();
      consoleMock.mockRestore();
    });
  });
});

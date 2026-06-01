// @vitest-environment happy-dom
import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { CustomerProvider, useCustomers } from './CustomerContext';
import type { Customer } from '../types';

// Mock getCsrfToken and jsonHeaders at top level to avoid hoisting warnings
vi.mock('../lib/api', () => ({
  getCsrfToken: () => 'test-csrf-token',
  jsonHeaders: () => ({ 'Content-Type': 'application/json', 'x-csrf-token': 'test-csrf-token' }),
}));

// Helper component to access CustomerContext during tests
const TestComponent = ({ callback }: { callback: (hookValues: ReturnType<typeof useCustomers>) => void }) => {
  const hookValues = useCustomers();
  callback(hookValues);
  return null;
};

describe('CustomerContext', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('addCustomer optimistically adds, then updates to server result, and increments trigger', async () => {
    const mockCustomerData = { name: 'John Doe', phone: '1234567890', address: '123 St', email: 'john@example.com' };
    const mockServerResponse = { ...mockCustomerData, id: 'server-id-123', createdAt: '2026-05-28T00:00:00Z' };

    let hook: ReturnType<typeof useCustomers> | undefined;
    const fetchMock = vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockServerResponse,
    } as Response);

    render(
      <CustomerProvider>
        <TestComponent callback={(h) => { hook = h; }} />
      </CustomerProvider>
    );

    expect(hook?.customers).toEqual([]);
    expect(hook?.customerRefreshTrigger).toBe(0);

    let promise: Promise<Customer> | undefined;
    act(() => {
      promise = hook!.addCustomer(mockCustomerData);
    });

    // Check optimistic update - temporary ID should start with tmp-
    expect(hook!.customers.length).toBe(1);
    expect(hook!.customers[0].name).toBe('John Doe');
    expect(hook!.customers[0].id).toMatch(/^tmp-/);

    // Resolve fetch promise
    await act(async () => {
      await promise;
    });

    // Check that state was updated with server values and trigger was incremented
    expect(hook!.customers.length).toBe(1);
    expect(hook!.customers[0].id).toBe('server-id-123');
    expect(hook!.customerRefreshTrigger).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/customers', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(mockCustomerData),
    }));
  });

  it('addCustomer rolls back on API failure', async () => {
    const mockCustomerData = { name: 'John Doe', phone: '1234567890', address: '123 St', email: 'john@example.com' };

    let hook: ReturnType<typeof useCustomers> | undefined;
    vi.mocked(fetch).mockRejectedValue(new Error('Network failure'));

    render(
      <CustomerProvider>
        <TestComponent callback={(h) => { hook = h; }} />
      </CustomerProvider>
    );

    let error: any;
    await act(async () => {
      try {
        await hook!.addCustomer(mockCustomerData);
      } catch (err) {
        error = err;
      }
    });

    expect(error).toBeDefined();
    // Verify rollback (customers list should be empty again)
    expect(hook!.customers).toEqual([]);
    expect(hook!.customerRefreshTrigger).toBe(0);
  });

  it('updateCustomer optimistically updates and rolls back on failure', async () => {
    let hook: ReturnType<typeof useCustomers> | undefined;
    const initialCustomer: Customer = { id: 'cust-1', name: 'Original Name', phone: '111', address: 'Addr', email: 'a@a.com', createdAt: '2026' };

    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Database update failed' }),
    } as Response);

    render(
      <CustomerProvider>
        <TestComponent callback={(h) => { hook = h; }} />
      </CustomerProvider>
    );

    // Set initial customers state directly
    act(() => {
      hook!.setCustomers([initialCustomer]);
    });

    let updatePromise: Promise<{ ok: boolean; error?: string }> | undefined;
    // Call updateCustomer inside act to flush optimistic state update
    act(() => {
      updatePromise = hook!.updateCustomer('cust-1', { name: 'Updated Name' });
    });

    // Check optimistic update
    expect(hook!.customers[0].name).toBe('Updated Name');

    let res: { ok: boolean; error?: string } | undefined;
    await act(async () => {
      res = await updatePromise;
    });

    // Verify response is error, state rolled back to original name, and trigger NOT incremented
    expect(res).toEqual({ ok: false, error: 'Database update failed' });
    expect(hook!.customers[0].name).toBe('Original Name');
    expect(hook!.customerRefreshTrigger).toBe(0);
  });

  it('deleteCustomer optimistically removes and rolls back on failure', async () => {
    let hook: ReturnType<typeof useCustomers> | undefined;
    const initialCustomer: Customer = { id: 'cust-1', name: 'To Delete', phone: '111', address: 'Addr', email: 'a@a.com', createdAt: '2026' };

    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Cannot delete customer with active jobs' }),
    } as Response);

    render(
      <CustomerProvider>
        <TestComponent callback={(h) => { hook = h; }} />
      </CustomerProvider>
    );

    // Set initial customers state directly
    act(() => {
      hook!.setCustomers([initialCustomer]);
    });

    let deletePromise: Promise<{ ok: boolean; error?: string }> | undefined;
    // Call deleteCustomer inside act to flush optimistic delete
    act(() => {
      deletePromise = hook!.deleteCustomer('cust-1');
    });

    // Check optimistic removal
    expect(hook!.customers).toEqual([]);

    let res: any;
    await act(async () => {
      res = await deletePromise;
    });

    // Verify response is error, state rolled back to contain customer, and trigger NOT incremented
    expect(res).toEqual({ ok: false, error: 'Cannot delete customer with active jobs' });
    expect(hook!.customers.length).toBe(1);
    expect(hook!.customers[0].id).toBe('cust-1');
    expect(hook!.customerRefreshTrigger).toBe(0);
  });
});

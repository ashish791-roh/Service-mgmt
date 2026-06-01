'use client';

import React, { createContext, useContext, useState } from 'react';
import type { Customer } from '../types';

interface CustomerContextType {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  addCustomer: (c: Omit<Customer, 'id' | 'createdAt'>) => Promise<Customer>;
  updateCustomer: (id: string, data: Partial<Pick<Customer, 'name' | 'phone' | 'address' | 'email'>>) => Promise<{ ok: boolean; error?: string }>;
  deleteCustomer: (id: string) => Promise<{ ok: boolean; error?: string }>;
  customerRefreshTrigger: number;
}

import { getCsrfToken, jsonHeaders } from '../lib/api';

const CustomerContext = createContext<CustomerContextType | null>(null);

export const CustomerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerRefreshTrigger, setCustomerRefreshTrigger] = useState(0);

  const addCustomer = async (c: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> => {
    const tempId = `tmp-${Date.now()}`;
    const optimistic: Customer = { ...c, id: tempId, createdAt: new Date().toISOString() };
    setCustomers(prev => [...prev, optimistic]);

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        credentials: 'same-origin',
        headers: jsonHeaders(),
        body: JSON.stringify(c),
      });
      const real = await res.json().catch(() => ({}));
      if (!res.ok || !real?.id) throw new Error(real?.error ?? 'Failed to create customer');
      setCustomers(prev => prev.map(x => x.id === tempId ? real : x));
      setCustomerRefreshTrigger(prev => prev + 1);
      return real;
    } catch (err) {
      setCustomers(prev => prev.filter(x => x.id !== tempId));
      throw err;
    }
  };

  const updateCustomer = async (id: string, data: Partial<Pick<Customer, 'name' | 'phone' | 'address' | 'email'>>): Promise<{ ok: boolean; error?: string }> => {
    let previous: Customer | undefined;
    setCustomers(prev => prev.map(c => {
      if (c.id !== id) return c;
      previous = c;
      return { ...c, ...data };
    }));

    try {
      const res = await fetch(`/api/customers?id=${id}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: jsonHeaders(),
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        if (previous) setCustomers(prev => prev.map(c => c.id === id ? previous! : c));
        return { ok: false, error: json.error ?? 'Failed to update customer.' };
      }
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...json } : c));
      setCustomerRefreshTrigger(prev => prev + 1);
      return { ok: true };
    } catch {
      if (previous) setCustomers(prev => prev.map(c => c.id === id ? previous! : c));
      return { ok: false, error: 'Network error.' };
    }
  };

  const deleteCustomer = async (id: string): Promise<{ ok: boolean; error?: string }> => {
    let removed: Customer | undefined;
    setCustomers(prev => {
      removed = prev.find(c => c.id === id);
      return prev.filter(c => c.id !== id);
    });

    try {
      const res = await fetch(`/api/customers?id=${id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'x-csrf-token': getCsrfToken() },
      });
      if (!res.ok) {
        const json = await res.json();
        if (removed) setCustomers(prev => [...prev, removed!]);
        return { ok: false, error: json.error ?? 'Failed to delete customer.' };
      }
      setCustomerRefreshTrigger(prev => prev + 1);
      return { ok: true };
    } catch {
      if (removed) setCustomers(prev => [...prev, removed!]);
      return { ok: false, error: 'Network error.' };
    }
  };

  return (
    <CustomerContext.Provider
      value={{
        customers,
        setCustomers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        customerRefreshTrigger,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomers = (): CustomerContextType => {
  const ctx = useContext(CustomerContext);
  if (!ctx) throw new Error('useCustomers must be used within CustomerProvider');
  return ctx;
};
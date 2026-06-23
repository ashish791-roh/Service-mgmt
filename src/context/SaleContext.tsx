'use client';

import React, { createContext, useContext, useState } from 'react';
import type { Sale } from '../types';
import { useNotifications } from './NotificationContext';

interface SaleContextType {
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  addSale: (sale: { companyName: string; contactName: string; phone: string; notes: string; customerId?: string; items: { inventoryItemId: string; quantity: number; unitPrice?: number }[] }) => Promise<{ ok: boolean; error?: string; sale?: Sale }>;
  markSalePaid: (saleId: string) => Promise<{ ok: boolean; error?: string }>;
}

import { jsonHeaders } from '../lib/api';

const SaleContext = createContext<SaleContextType | null>(null);

export const SaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const { setNotifications } = useNotifications();

  const addSale = async (saleData: {
    companyName: string;
    contactName: string;
    phone: string;
    notes: string;
    customerId?: string;
    items: { inventoryItemId: string; quantity: number; unitPrice?: number }[];
  }): Promise<{ ok: boolean; error?: string; sale?: Sale }> => {
    // Optimistic
    const tempId = `tmp-${Date.now()}`;
    const optimistic: Sale = {
      id: tempId,
      saleNumber: `SALE-TMP-${Date.now()}`,
      companyName: saleData.companyName,
      contactName: saleData.contactName,
      phone: saleData.phone,
      notes: saleData.notes,
      customerId: saleData.customerId || null,
      items: saleData.items.map(i => ({ ...i, id: `tmp-item-${Math.random()}` })) as any,
      totalAmount: saleData.items.reduce((sum, item) => sum + (item.unitPrice ?? 0) * item.quantity, 0),
      paidAt: null,
      createdById: 'default',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      branchId: 'default',
    };
    setSales(prev => [optimistic, ...prev]);

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(saleData),
      });
      const data = await res.json();
      if (!res.ok) {
        setSales(prev => prev.filter(s => s.id !== tempId));
        return { ok: false, error: data.error ?? 'Failed to create sale.' };
      }
      setSales(prev => prev.map(s => s.id === tempId ? data : s));

      fetch('/api/notifications', { credentials: 'same-origin' })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.notifications) setNotifications(d.notifications); })
        .catch(() => {});

      return { ok: true, sale: data };
    } catch {
      setSales(prev => prev.filter(s => s.id !== tempId));
      return { ok: false, error: 'Network error. Please try again.' };
    }
  };

  const markSalePaid = async (saleId: string): Promise<{ ok: boolean; error?: string }> => {
    const paidAt = new Date().toISOString();
    const previous = sales;
    setSales(prev => prev.map(s => s.id === saleId ? { ...s, paidAt } : s));

    try {
      const res = await fetch('/api/sales', {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify({ saleId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSales(previous);
        return { ok: false, error: data.error ?? 'Failed to mark sale as paid.' };
      }
      setSales(prev => prev.map(s => s.id === saleId ? { ...s, paidAt: data.paidAt } : s));
      return { ok: true };
    } catch {
      setSales(previous);
      return { ok: false, error: 'Network error. Please try again.' };
    }
  };

  return (
    <SaleContext.Provider
      value={{
        sales,
        setSales,
        addSale,
        markSalePaid,
      }}
    >
      {children}
    </SaleContext.Provider>
  );
};

export const useSales = (): SaleContextType => {
  const ctx = useContext(SaleContext);
  if (!ctx) throw new Error('useSales must be used within SaleProvider');
  return ctx;
};

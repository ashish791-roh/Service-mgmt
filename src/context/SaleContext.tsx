'use client';

import React, { createContext, useContext, useState } from 'react';
import type { Sale } from '../types';
import { useInventory } from './InventoryContext';
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
  const { setInventory } = useInventory();
  const { setNotifications } = useNotifications();

  const addSale = async (saleData: {
    companyName: string;
    contactName: string;
    phone: string;
    notes: string;
    customerId?: string;
    items: { inventoryItemId: string; quantity: number; unitPrice?: number }[];
  }): Promise<{ ok: boolean; error?: string; sale?: Sale }> => {
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(saleData),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error ?? 'Failed to create sale.' };

      setSales(prev => [data, ...prev]);
      
      // Update inventory and notifications
      fetch('/api/data')
        .then(res => res.json())
        .then(appData => {
          if (appData.inventory) setInventory(appData.inventory);
          if (appData.notifications) setNotifications(appData.notifications);
        })
        .catch(() => {});

      return { ok: true, sale: data };
    } catch {
      return { ok: false, error: 'Network error. Please try again.' };
    }
  };

  const markSalePaid = async (saleId: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/sales', {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify({ saleId }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error ?? 'Failed to mark sale as paid.' };

      setSales(prev => prev.map(s => s.id === saleId ? { ...s, paidAt: data.paidAt } : s));
      return { ok: true };
    } catch {
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

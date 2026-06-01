'use client';

import React, { createContext, useContext, useState } from 'react';
import type { InventoryItem } from '../types';
import { usePartRequests } from './PartRequestContext';

interface InventoryContextType {
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateInventory: (id: string, quantity: number) => void;
  editInventoryItem: (id: string, data: { unitCost?: number; minStock?: number }) => void;
  deleteInventoryItem: (id: string) => void;
}

import { getCsrfToken, jsonHeaders } from '../lib/api';

const InventoryContext = createContext<InventoryContextType | null>(null);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const { setPartRequests } = usePartRequests();

  const promoteAwaitingStockRequests = async (updatedInventory: InventoryItem[]) => {
    setPartRequests(prev => {
      const toPromote = prev.filter(r => {
        if (r.status !== 'AwaitingStock') return false;
        const match = updatedInventory.find(
          i => i.name.toLowerCase() === r.partName.toLowerCase()
        );
        return match && match.quantity > 0;
      });

      if (toPromote.length === 0) return prev;

      const next = prev.map(r =>
        toPromote.some(p => p.id === r.id)
          ? { ...r, status: 'Pending' as const, inventoryStatus: 'available' as const }
          : r
      );

      toPromote.forEach(r => {
        fetch(`/api/parts/${r.id}`, {
          method: 'PATCH',
          headers: { 'x-csrf-token': getCsrfToken() },
        }).catch(console.error);
      });

      return next;
    });
  };

  const addInventoryItem = (item: Omit<InventoryItem, 'id'>) => {
    const tempId = `tmp-${Date.now()}`;
    const optimistic = { ...item, id: tempId } as InventoryItem;
    setInventory(prev => [...prev, optimistic]);

    fetch('/api/inventory', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(item),
    })
      .then(res => res.json())
      .then(real => {
        setInventory(prev => {
          const next = prev.map(x => x.id === tempId ? real : x);
          promoteAwaitingStockRequests(next);
          return next;
        });
      })
      .catch(() => setInventory(prev => prev.filter(x => x.id !== tempId)));
  };

  const updateInventory = (id: string, quantity: number) => {
    setInventory(prev => {
      const next = prev.map(i => i.id === id ? { ...i, quantity } : i);
      if (quantity > 0) promoteAwaitingStockRequests(next);
      return next;
    });

    fetch('/api/inventory', {
      method: 'PUT',
      headers: jsonHeaders(),
      body: JSON.stringify({ id, quantity }),
    }).catch(console.error);
  };

  const editInventoryItem = (id: string, data: { unitCost?: number; minStock?: number }) => {
    setInventory(prev => prev.map(i => i.id === id ? {
      ...i,
      ...(data.unitCost !== undefined ? { unitCost: data.unitCost } : {}),
      ...(data.minStock !== undefined ? { minStock: data.minStock } : {}),
    } : i));

    fetch('/api/inventory', {
      method: 'PUT',
      headers: jsonHeaders(),
      body: JSON.stringify({ id, ...data }),
    }).catch(console.error);
  };

  const deleteInventoryItem = (id: string) => {
    setInventory(prev => prev.filter(i => i.id !== id));

    fetch(`/api/inventory?id=${id}`, {
      method: 'DELETE',
      headers: { 'x-csrf-token': getCsrfToken() },
    })
      .then(res => { if (!res.ok) throw new Error(); })
      .catch(() => {
        console.error('Failed to delete inventory item');
      });
  };

  return (
    <InventoryContext.Provider
      value={{
        inventory,
        setInventory,
        addInventoryItem,
        updateInventory,
        editInventoryItem,
        deleteInventoryItem,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = (): InventoryContextType => {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used within InventoryProvider');
  return ctx;
};

'use client';

import React, { createContext, useContext, useState } from 'react';
import type { PartRequest, PartRequestStatus } from '../types';
import { useNotifications } from './NotificationContext';
import { useJobs } from './JobContext';

interface PartRequestContextType {
  partRequests: PartRequest[];
  setPartRequests: React.Dispatch<React.SetStateAction<PartRequest[]>>;
  addPartRequest: (r: Omit<PartRequest, 'id' | 'createdAt' | 'status'>) => void;
  updatePartRequest: (id: string, status: PartRequestStatus) => void;
}

import { jsonHeaders } from '../lib/api';

const PartRequestContext = createContext<PartRequestContextType | null>(null);

export const PartRequestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [partRequests, setPartRequests] = useState<PartRequest[]>([]);
  const { setNotifications } = useNotifications();
  const { setJobs } = useJobs();

  const addPartRequest = (r: Omit<PartRequest, 'id' | 'createdAt' | 'status'>) => {
    const tempId = `tmp-${Date.now()}`;
    const optimistic: PartRequest = { ...r, id: tempId, createdAt: new Date().toISOString(), status: 'Pending' };
    setPartRequests(prev => [...prev, optimistic]);

    fetch('/api/parts', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(r),
    })
      .then(res => res.json())
      .then(real => setPartRequests(prev => prev.map(x => x.id === tempId ? {
        ...real,
        inventoryStatus: real.inventoryStatus,
        inventoryQuantity: real.inventoryQuantity,
        inventoryMinStock: real.inventoryMinStock,
      } : x)))
      .catch(() => setPartRequests(prev => prev.filter(x => x.id !== tempId)));
  };

  const updatePartRequest = (id: string, status: PartRequestStatus) => {
    setPartRequests(prev => prev.map(r => r.id === id
      ? { ...r, status, reviewedAt: new Date().toISOString() }
      : r
    ));

    fetch(`/api/parts/${id}`, {
      method: 'PUT',
      headers: jsonHeaders(),
      body: JSON.stringify({ status }),
    })
      .then(() => {
        fetch('/api/data')
          .then(res => res.json())
          .then(data => {
            if (data.notifications) setNotifications(data.notifications);
            if (status === 'Approved' && data.jobs) {
              setJobs(data.jobs);
            }
          });
      })
      .catch(console.error);
  };

  return (
    <PartRequestContext.Provider
      value={{
        partRequests,
        setPartRequests,
        addPartRequest,
        updatePartRequest,
      }}
    >
      {children}
    </PartRequestContext.Provider>
  );
};

export const usePartRequests = (): PartRequestContextType => {
  const ctx = useContext(PartRequestContext);
  if (!ctx) throw new Error('usePartRequests must be used within PartRequestProvider');
  return ctx;
};

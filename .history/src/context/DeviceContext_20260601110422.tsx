'use client';

import React, { createContext, useContext, useState } from 'react';
import type { Device } from '../types';

interface DeviceContextType {
  devices: Device[];
  setDevices: React.Dispatch<React.SetStateAction<Device[]>>;
  addDevice: (d: Omit<Device, 'id'>) => Promise<Device>;
}

import { jsonHeaders } from '../lib/api';

const DeviceContext = createContext<DeviceContextType | null>(null);

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [devices, setDevices] = useState<Device[]>([]);

  const addDevice = async (d: Omit<Device, 'id'>): Promise<Device> => {
    const tempId = `tmp-${Date.now()}`;
    const optimistic: Device = { ...d, id: tempId };
    setDevices(prev => [...prev, optimistic]);

    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        credentials: 'same-origin',
        headers: jsonHeaders(),
        body: JSON.stringify(d),
      });
      const real = await res.json();
      if (!real?.id) throw new Error('Invalid device response');
      setDevices(prev => prev.map(x => x.id === tempId ? real : x));
      return real;
    } catch (err) {
      setDevices(prev => prev.filter(x => x.id !== tempId));
      throw err;
    }
  };

  return (
    <DeviceContext.Provider
      value={{
        devices,
        setDevices,
        addDevice,
      }}
    >
      {children}
    </DeviceContext.Provider>
  );
};

export const useDevices = (): DeviceContextType => {
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error('useDevices must be used within DeviceProvider');
  return ctx;
};

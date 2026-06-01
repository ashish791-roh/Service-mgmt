'use client';

import React, { createContext, useContext, useState } from 'react';
import {
  loadSLATiers,
  getSLAStatus as computeSLAStatus,
  saveSLATiersToAPI,
  type SLATier,
  type SLAStatus,
} from '../lib/sla';
import type { Job } from '../types';

interface SLAContextType {
  slaTiers: SLATier[];
  setSlaTiers: React.Dispatch<React.SetStateAction<SLATier[]>>;
  updateSLATiers: (tiers: SLATier[]) => Promise<void>;
  getJobSLAStatus: (job: Job, deviceType?: string) => SLAStatus;
}

const SLAContext = createContext<SLAContextType | null>(null);

export const SLAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [slaTiers, setSlaTiers] = useState<SLATier[]>(loadSLATiers);

  const updateSLATiers = async (tiers: SLATier[]) => {
    setSlaTiers(tiers);
    await saveSLATiersToAPI(tiers);
  };

  const getJobSLAStatus = (job: Job, deviceType?: string): SLAStatus => {
    return computeSLAStatus(job.createdAt, job.status, deviceType, slaTiers);
  };

  return (
    <SLAContext.Provider
      value={{
        slaTiers,
        setSlaTiers,
        updateSLATiers,
        getJobSLAStatus,
      }}
    >
      {children}
    </SLAContext.Provider>
  );
};

export const useSLA = (): SLAContextType => {
  const ctx = useContext(SLAContext);
  if (!ctx) throw new Error('useSLA must be used within SLAProvider');
  return ctx;
};

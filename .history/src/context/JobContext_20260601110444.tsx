'use client';

import React, { createContext, useContext, useState } from 'react';
import type { Job, JobStatus, JobPhoto, ChecklistItem } from '../types';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';

interface JobContextType {
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  addJob: (j: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Job>;
  updateJob: (jobId: string, data: { problemDescription?: string; estimatedCost?: number; advanceAmount?: number; assignedEngineerId?: string | null; reassignReason?: string }) => Promise<{ ok: boolean; error?: string }>;
  updateJobStatus: (jobId: string, status: JobStatus, notes?: string, checklist?: ChecklistItem[], rating?: number, feedback?: string, linkedJobId?: string) => Promise<{ ok: boolean; error?: string }>;
  uploadJobPhoto: (jobId: string, file: File, type: 'before' | 'after') => Promise<{ ok: boolean; error?: string; photo?: JobPhoto }>;
  assignEngineer: (jobId: string, engineerId: string, reassignReason?: string) => void;
  deleteJob: (id: string) => Promise<{ ok: boolean; error?: string }>;
  jobRefreshTrigger: number;
}

import { getCsrfToken, jsonHeaders } from '../lib/api';

const JobContext = createContext<JobContextType | null>(null);

export const JobProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobRefreshTrigger, setJobRefreshTrigger] = useState(0);
  const { currentUser } = useAuth();
  const { setNotifications } = useNotifications();

  const addJob = async (j: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job> => {
    const now = new Date().toISOString();
    const tempId = `tmp-${Date.now()}`;
    const optimistic: Job = { ...j, id: tempId, createdAt: now, updatedAt: now };
    setJobs(prev => [...prev, optimistic]);

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        credentials: 'same-origin',
        headers: jsonHeaders(),
        body: JSON.stringify(j),
      });
      const real = await res.json().catch(() => ({}));
      if (!res.ok || !real?.id) {
        console.error('[addJob] API returned invalid job:', real);
        setJobs(prev => prev.filter(x => x.id !== tempId));
        throw new Error(real?.error ?? 'Failed to create job');
      }
      setJobs(prev => prev.map(x => x.id === tempId ? real : x));
      setJobRefreshTrigger(prev => prev + 1);
      
      // Load updated notifications
      fetch('/api/data', { credentials: 'same-origin' })
        .then(res => res.json())
        .then(data => {
          if (data.notifications) setNotifications(data.notifications);
        })
        .catch(() => {});
        
      return real;
    } catch (err) {
      setJobs(prev => prev.filter(x => x.id !== tempId));
      throw err;
    }
  };

  const updateJob = async (
    jobId: string,
    data: {
      problemDescription?: string;
      estimatedCost?: number;
      advanceAmount?: number;
      assignedEngineerId?: string | null;
      reassignReason?: string;
    }
  ): Promise<{ ok: boolean; error?: string }> => {
    const previousJobs = jobs;
    const now = new Date().toISOString();

    setJobs(prev => prev.map(j => j.id === jobId ? {
      ...j,
      updatedAt: now,
      ...(data.problemDescription !== undefined ? { problemDescription: data.problemDescription } : {}),
      ...(data.estimatedCost !== undefined ? { estimatedCost: data.estimatedCost } : {}),
      ...(data.advanceAmount !== undefined ? { advanceAmount: data.advanceAmount } : {}),
      ...(data.assignedEngineerId !== undefined ? { assignedEngineerId: data.assignedEngineerId } : {}),
    } : j));

    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: jsonHeaders(),
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setJobs(previousJobs);
        return { ok: false, error: json.error ?? 'Failed to update job.' };
      }

      const updated = await res.json().catch(() => null);
      if (updated?.id) {
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...updated } : j));
      }
      setJobRefreshTrigger(prev => prev + 1);

      return { ok: true };
    } catch {
      setJobs(previousJobs);
      return { ok: false, error: 'Network error — please check your connection.' };
    }
  };

  const updateJobStatus = async (
    jobId: string,
    status: JobStatus,
    notes?: string,
    checklist?: ChecklistItem[],
    rating?: number,
    feedback?: string,
    linkedJobId?: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const previousJobs = jobs;
    const now = new Date().toISOString();

    setJobs(prev => prev.map(j => j.id === jobId ? {
      ...j,
      status,
      updatedAt: now,
      ...(notes !== undefined ? { repairNotes: notes } : {}),
      ...(checklist !== undefined ? { checklist } : {}),
      ...(rating !== undefined ? { rating } : {}),
      ...(feedback !== undefined ? { feedback } : {}),
      ...(linkedJobId !== undefined ? { linkedJobId } : {}),
      ...(status === 'Completed' ? { completedAt: now } : {}),
    } : j));

    try {
      const isEngineer = currentUser?.role === 'engineer';

      const res = await fetch(`/api/jobs/${jobId}`, {
        method: isEngineer ? 'PATCH' : 'PUT',
        credentials: 'same-origin',
        headers: jsonHeaders(),
        body: JSON.stringify({ status, repairNotes: notes, checklist, rating, feedback, linkedJobId }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setJobs(previousJobs);
        return { ok: false, error: json.error ?? 'Failed to update job status.' };
      }
      setJobRefreshTrigger(prev => prev + 1);

      return { ok: true };
    } catch {
      setJobs(previousJobs);
      return { ok: false, error: 'Network error — please check your connection.' };
    }
  };

  const uploadJobPhoto = async (jobId: string, file: File, type: 'before' | 'after'): Promise<{ ok: boolean; error?: string; photo?: JobPhoto }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const res = await fetch(`/api/jobs/${jobId}/photos`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'x-csrf-token': getCsrfToken() },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to upload photo.' };
      }

      setJobs(prev => prev.map(j => {
        if (j.id === jobId) {
          const newPhotos = [...(j.photos || []), data];
          return { ...j, photos: newPhotos };
        }
        return j;
      }));
      setJobRefreshTrigger(prev => prev + 1);

      return { ok: true, photo: data };
    } catch (err) {
      return { ok: false, error: 'Network error. Please try again.' };
    }
  };

  const assignEngineer = (jobId: string, engineerId: string, reassignReason?: string) => {
    const now = new Date().toISOString();
    setJobs(prev => prev.map(j => j.id === jobId
      ? { ...j, assignedEngineerId: engineerId, status: 'Assigned' as JobStatus, updatedAt: now }
      : j
    ));

    fetch(`/api/jobs/${jobId}`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: jsonHeaders(),
      body: JSON.stringify({ assignedEngineerId: engineerId, status: 'Assigned', ...(reassignReason ? { reassignReason } : {}) }),
    })
      .then(() => {
        setJobRefreshTrigger(prev => prev + 1);
        fetch('/api/data', { credentials: 'same-origin' })
          .then(res => res.json())
          .then(data => {
            if (data.notifications) setNotifications(data.notifications);
          });
      })
      .catch(console.error);
  };

  const deleteJob = async (id: string): Promise<{ ok: boolean; error?: string }> => {
    const previousJobs = jobs;
    setJobs(prev => prev.filter(j => j.id !== id));

    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'x-csrf-token': getCsrfToken() },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setJobs(previousJobs);
        return { ok: false, error: json.error ?? 'Failed to delete job.' };
      }
      setJobRefreshTrigger(prev => prev + 1);
      return { ok: true };
    } catch {
      setJobs(previousJobs);
      return { ok: false, error: 'Network error.' };
    }
  };

  return (
    <JobContext.Provider
      value={{
        jobs,
        setJobs,
        addJob,
        updateJob,
        updateJobStatus,
        uploadJobPhoto,
        assignEngineer,
        deleteJob,
        jobRefreshTrigger,
      }}
    >
      {children}
    </JobContext.Provider>
  );
};

export const useJobs = (): JobContextType => {
  const ctx = useContext(JobContext);
  if (!ctx) throw new Error('useJobs must be used within JobProvider');
  return ctx;
};

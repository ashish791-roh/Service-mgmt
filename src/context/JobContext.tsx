'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { Job, JobStatus, JobPhoto, ChecklistItem } from '../types';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';
import { getCsrfToken, jsonHeaders } from '../lib/api';

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
  pendingMutationCount: number;
}

interface QueuedMutation {
  type: 'add' | 'update' | 'updateStatus';
  payload: any;
  resolve: (val: any) => void;
  reject: (err: any) => void;
  timestamp: number;
}

const JobContext = createContext<JobContextType | null>(null);

export const JobProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobRefreshTrigger, setJobRefreshTrigger] = useState(0);
  const [pendingQueue, setPendingQueue] = useState<QueuedMutation[]>([]);
  const { currentUser } = useAuth();
  const { setNotifications } = useNotifications();

  const queueRef = useRef<QueuedMutation[]>([]);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const offlineTimeoutRef = useRef<any>(null);

  const getAbortSignal = (key: string) => {
    const existing = abortControllersRef.current.get(key);
    if (existing) {
      existing.abort();
    }
    const ctrl = new AbortController();
    abortControllersRef.current.set(key, ctrl);
    return ctrl.signal;
  };

  const queueMutation = (type: 'add' | 'update' | 'updateStatus', payload: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      const newItem: QueuedMutation = { type, payload, resolve, reject, timestamp: Date.now() };
      queueRef.current.push(newItem);
      setPendingQueue([...queueRef.current]);
    });
  };

  const executeAddJobDirect = async (j: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>, signal?: AbortSignal): Promise<Job> => {
    const tempId = `tmp-${Date.now()}`;
    const now = new Date().toISOString();
    const optimistic: Job = { ...j, id: tempId, createdAt: now, updatedAt: now };
    setJobs(prev => [...prev, optimistic]);

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        credentials: 'same-origin',
        headers: jsonHeaders(),
        body: JSON.stringify(j),
        signal,
      });
      const real = await res.json().catch(() => ({}));
      if (!res.ok || !real?.id) {
        setJobs(prev => prev.filter(x => x.id !== tempId));
        throw new Error(real?.error ?? 'Failed to create job');
      }
      setJobs(prev => prev.map(x => x.id === tempId ? real : x));
      setJobRefreshTrigger(prev => prev + 1);

      fetch('/api/notifications', { credentials: 'same-origin' })
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data?.notifications) setNotifications(data.notifications); })
        .catch(() => {});

      return real;
    } catch (err) {
      setJobs(prev => prev.filter(x => x.id !== tempId));
      throw err;
    }
  };

  const executeUpdateJobDirect = async (
    jobId: string,
    data: {
      problemDescription?: string;
      estimatedCost?: number;
      advanceAmount?: number;
      assignedEngineerId?: string | null;
      reassignReason?: string;
    },
    signal?: AbortSignal
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
        signal,
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
      // SMART POLLING: Do not update jobRefreshTrigger for metadata-only updates.

      return { ok: true };
    } catch (e: any) {
      if (e.name === 'AbortError') return { ok: false, error: 'Request aborted' };
      setJobs(previousJobs);
      return { ok: false, error: 'Network error — please check your connection.' };
    }
  };

  const executeUpdateJobStatusDirect = async (
    jobId: string,
    status: JobStatus,
    notes?: string,
    checklist?: ChecklistItem[],
    rating?: number,
    feedback?: string,
    linkedJobId?: string,
    signal?: AbortSignal
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
        signal,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setJobs(previousJobs);
        return { ok: false, error: json.error ?? 'Failed to update job status.' };
      }
      // SMART POLLING: Trigger refresh because status changed.
      setJobRefreshTrigger(prev => prev + 1);

      return { ok: true };
    } catch (e: any) {
      if (e.name === 'AbortError') return { ok: false, error: 'Request aborted' };
      setJobs(previousJobs);
      return { ok: false, error: 'Network error — please check your connection.' };
    }
  };

  const drainQueue = async () => {
    const items = [...queueRef.current];
    queueRef.current = [];
    setPendingQueue([]);

    for (const item of items) {
      try {
        let res;
        const signal = getAbortSignal(`queued-${item.type}-${item.payload.jobId || 'add'}`);
        if (item.type === 'add') {
          res = await executeAddJobDirect(item.payload, signal);
        } else if (item.type === 'update') {
          res = await executeUpdateJobDirect(item.payload.jobId, item.payload.data, signal);
        } else if (item.type === 'updateStatus') {
          res = await executeUpdateJobStatusDirect(
            item.payload.jobId,
            item.payload.status,
            item.payload.notes,
            item.payload.checklist,
            item.payload.rating,
            item.payload.feedback,
            item.payload.linkedJobId,
            signal
          );
        }
        item.resolve(res);
      } catch (err) {
        item.reject(err);
      }
    }
  };

  useEffect(() => {
    const handleOffline = () => {
      if (offlineTimeoutRef.current) clearTimeout(offlineTimeoutRef.current);
      offlineTimeoutRef.current = setTimeout(() => {
        queueRef.current.forEach(item => {
          item.reject(new Error('Offline timeout: mutation discarded.'));
        });
        queueRef.current = [];
        setPendingQueue([]);
      }, 30_000);
    };

    const handleOnline = () => {
      if (offlineTimeoutRef.current) {
        clearTimeout(offlineTimeoutRef.current);
        offlineTimeoutRef.current = null;
      }
      drainQueue();
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      if (offlineTimeoutRef.current) clearTimeout(offlineTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addJob = async (j: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return queueMutation('add', j);
    }
    const signal = getAbortSignal('addJob');
    return executeAddJobDirect(j, signal);
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
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return queueMutation('update', { jobId, data });
    }
    const signal = getAbortSignal(`${jobId}:update`);
    return executeUpdateJobDirect(jobId, data, signal);
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
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return queueMutation('updateStatus', { jobId, status, notes, checklist, rating, feedback, linkedJobId });
    }
    const signal = getAbortSignal(`${jobId}:status`);
    return executeUpdateJobStatusDirect(jobId, status, notes, checklist, rating, feedback, linkedJobId, signal);
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
        fetch('/api/notifications', { credentials: 'same-origin' })
          .then(res => res.ok ? res.json() : null)
          .then(data => { if (data?.notifications) setNotifications(data.notifications); })
          .catch(() => {});
      })
      .catch(console.error);
  };
  const deleteJob = async (id: string): Promise<{ ok: boolean; error?: string }> => {
    const jobToDelete = jobs.find(j => j.id === id);
    if (!jobToDelete) return { ok: false, error: 'Job not found' };

    const previousJobs = jobs;
    setJobs(prev => prev.filter(j => j.id !== id));

    let undone = false;
    let timeoutId: any = null;

    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
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
      } catch (err) {
        setJobs(previousJobs);
        return { ok: false, error: 'Network error.' };
      }
    }

    const performDelete = async () => {
      if (undone) return;
      try {
        const res = await fetch(`/api/jobs/${id}`, {
          method: 'DELETE',
          credentials: 'same-origin',
          headers: { 'x-csrf-token': getCsrfToken() },
        });
        if (!res.ok) {
          setJobs(previousJobs);
        } else {
          setJobRefreshTrigger(prev => prev + 1);
        }
      } catch {
        setJobs(previousJobs);
      }
    };

    timeoutId = setTimeout(performDelete, 4000);

    const onUndo = async () => {
      undone = true;
      if (timeoutId) clearTimeout(timeoutId);
      setJobs(prev => {
        if (prev.some(j => j.id === id)) return prev;
        return [...prev, jobToDelete];
      });
      try {
        await fetch(`/api/jobs/${id}`, {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: jsonHeaders(),
          body: JSON.stringify({ undoDelete: true }),
        });
        setJobRefreshTrigger(prev => prev + 1);
      } catch (e) {
        console.error('[undo delete failed]', e);
      }
    };

    window.dispatchEvent(new CustomEvent('fixhub:undo-toast', {
      detail: {
        message: 'Job deleted',
        onUndo
      }
    }));

    return { ok: true };
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
        pendingMutationCount: pendingQueue.length,
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

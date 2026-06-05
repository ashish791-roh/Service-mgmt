// @vitest-environment happy-dom
import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { JobProvider, useJobs } from './JobContext';
import type { Job } from '../types';

// Mock getCsrfToken and jsonHeaders
vi.mock('../lib/api', () => ({
  getCsrfToken: () => 'test-csrf-token',
  jsonHeaders: () => ({ 'Content-Type': 'application/json', 'x-csrf-token': 'test-csrf-token' }),
}));

// Mock AuthContext and NotificationContext
const mockCurrentUser = { id: 'admin-1', name: 'Admin', role: 'admin' };
vi.mock('./AuthContext', () => ({
  useAuth: () => ({
    currentUser: mockCurrentUser,
  }),
}));

const mockSetNotifications = vi.fn();
vi.mock('./NotificationContext', () => ({
  useNotifications: () => ({
    setNotifications: mockSetNotifications,
  }),
}));

// Helper component to access JobContext during tests
const TestComponent = ({ callback }: { callback: (hookValues: ReturnType<typeof useJobs>) => void }) => {
  const hookValues = useJobs();
  callback(hookValues);
  return null;
};

describe('JobContext', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    mockSetNotifications.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('addJob optimistically adds, then updates with server response, and fetches data', async () => {
    const mockJobData = {
      customerId: 'cust-1',
      deviceId: 'dev-1',
      problemDescription: 'Broken screen',
      estimatedCost: 1500,
      advanceAmount: 500,
      assignedEngineerId: null,
      status: 'New' as const,
    };
    const mockServerResponse = {
      ...mockJobData,
      id: 'job-123',
      createdAt: '2026-05-31T00:00:00Z',
      updatedAt: '2026-05-31T00:00:00Z',
    };

    let hook: ReturnType<typeof useJobs> | undefined;
    const fetchMock = vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockServerResponse,
      } as Response) // For /api/jobs POST
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notifications: [] }),
      } as Response); // For /api/data GET

    render(
      <JobProvider>
        <TestComponent callback={(h) => { hook = h; }} />
      </JobProvider>
    );

    expect(hook?.jobs).toEqual([]);
    expect(hook?.jobRefreshTrigger).toBe(0);

    let promise: Promise<Job> | undefined;
    act(() => {
      promise = hook!.addJob(mockJobData);
    });

    // Check optimistic update
    expect(hook!.jobs.length).toBe(1);
    expect(hook!.jobs[0].problemDescription).toBe('Broken screen');
    expect(hook!.jobs[0].id).toMatch(/^tmp-/);

    // Resolve fetch promise
    await act(async () => {
      await promise;
    });

    // Verify state updated from server response
    expect(hook!.jobs.length).toBe(1);
    expect(hook!.jobs[0].id).toBe('job-123');
    expect(hook!.jobRefreshTrigger).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/jobs', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(mockJobData),
    }));
  });

  it('addJob rolls back on API failure', async () => {
    const mockJobData = {
      customerId: 'cust-1',
      deviceId: 'dev-1',
      problemDescription: 'Broken screen',
      estimatedCost: 1500,
      advanceAmount: 500,
      assignedEngineerId: null,
      status: 'New' as const,
    };

    let hook: ReturnType<typeof useJobs> | undefined;
    vi.mocked(fetch).mockRejectedValue(new Error('Network failure'));

    render(
      <JobProvider>
        <TestComponent callback={(h) => { hook = h; }} />
      </JobProvider>
    );

    let error: any;
    await act(async () => {
      try {
        await hook!.addJob(mockJobData);
      } catch (err) {
        error = err;
      }
    });

    expect(error).toBeDefined();
    // Verify rollback (jobs list should be empty again)
    expect(hook!.jobs).toEqual([]);
    expect(hook!.jobRefreshTrigger).toBe(0);
  });

  it('updateJob optimistically updates and rolls back on failure', async () => {
    let hook: ReturnType<typeof useJobs> | undefined;
    const initialJob: Job = {
      id: 'job-1',
      customerId: 'cust-1',
      deviceId: 'dev-1',
      problemDescription: 'Original Description',
      estimatedCost: 1000,
      advanceAmount: 0,
      assignedEngineerId: null,
      status: 'New',
      createdAt: '2026-05-31T00:00:00Z',
      updatedAt: '2026-05-31T00:00:00Z',
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Database update failed' }),
    } as Response);

    render(
      <JobProvider>
        <TestComponent callback={(h) => { hook = h; }} />
      </JobProvider>
    );

    act(() => {
      hook!.setJobs([initialJob]);
    });

    let updatePromise: Promise<{ ok: boolean; error?: string }> | undefined;
    act(() => {
      updatePromise = hook!.updateJob('job-1', { problemDescription: 'Updated Description' });
    });

    // Check optimistic update
    expect(hook!.jobs[0].problemDescription).toBe('Updated Description');

    let res: { ok: boolean; error?: string } | undefined;
    await act(async () => {
      res = await updatePromise;
    });

    // Verify rollback
    expect(res).toEqual({ ok: false, error: 'Database update failed' });
    expect(hook!.jobs[0].problemDescription).toBe('Original Description');
    expect(hook!.jobRefreshTrigger).toBe(0);
  });

  it('updateJobStatus optimistically updates and rolls back on failure', async () => {
    let hook: ReturnType<typeof useJobs> | undefined;
    const initialJob: Job = {
      id: 'job-1',
      customerId: 'cust-1',
      deviceId: 'dev-1',
      problemDescription: 'Problem',
      estimatedCost: 1000,
      advanceAmount: 0,
      assignedEngineerId: null,
      status: 'New',
      createdAt: '2026-05-31T00:00:00Z',
      updatedAt: '2026-05-31T00:00:00Z',
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Invalid transition' }),
    } as Response);

    render(
      <JobProvider>
        <TestComponent callback={(h) => { hook = h; }} />
      </JobProvider>
    );

    act(() => {
      hook!.setJobs([initialJob]);
    });

    let statusPromise: Promise<{ ok: boolean; error?: string }> | undefined;
    act(() => {
      statusPromise = hook!.updateJobStatus('job-1', 'Completed');
    });

    // Check optimistic status
    expect(hook!.jobs[0].status).toBe('Completed');

    let res: { ok: boolean; error?: string } | undefined;
    await act(async () => {
      res = await statusPromise;
    });

    // Verify rollback
    expect(res).toEqual({ ok: false, error: 'Invalid transition' });
    expect(hook!.jobs[0].status).toBe('New');
    expect(hook!.jobRefreshTrigger).toBe(0);
  });

  it('deleteJob optimistically removes and rolls back on failure', async () => {
    let hook: ReturnType<typeof useJobs> | undefined;
    const initialJob: Job = {
      id: 'job-1',
      customerId: 'cust-1',
      deviceId: 'dev-1',
      problemDescription: 'Problem',
      estimatedCost: 1000,
      advanceAmount: 0,
      assignedEngineerId: null,
      status: 'New',
      createdAt: '2026-05-31T00:00:00Z',
      updatedAt: '2026-05-31T00:00:00Z',
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Unauthorized' }),
    } as Response);

    render(
      <JobProvider>
        <TestComponent callback={(h) => { hook = h; }} />
      </JobProvider>
    );

    act(() => {
      hook!.setJobs([initialJob]);
    });

    let deletePromise: Promise<{ ok: boolean; error?: string }> | undefined;
    act(() => {
      deletePromise = hook!.deleteJob('job-1');
    });

    // Check optimistic deletion
    expect(hook!.jobs).toEqual([]);

    let res: { ok: boolean; error?: string } | undefined;
    await act(async () => {
      res = await deletePromise;
    });

    // Verify rollback
    expect(res).toEqual({ ok: false, error: 'Unauthorized' });
    expect(hook!.jobs.length).toBe(1);
    expect(hook!.jobs[0].id).toBe('job-1');
    expect(hook!.jobRefreshTrigger).toBe(0);
  });
});
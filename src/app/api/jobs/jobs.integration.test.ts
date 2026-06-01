import { describe, expect, it, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { GET, POST } from './route';
import { PUT, PATCH, DELETE } from './[id]/route';

const getMock = vi.fn();

// Mock cookies store globally
vi.mock('next/headers', () => {
  return {
    cookies: vi.fn().mockImplementation(async () => ({
      get: getMock,
    })),
  };
});

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn((x) => x),
    session: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    job: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
    },
    device: {
      findUnique: vi.fn(),
    },
    partRequest: {
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
    payment: {
      deleteMany: vi.fn(),
    },
    notification: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

// Mock audit log and notifications
vi.mock('@/lib/auditLog', () => ({
  writeAuditLog: vi.fn().mockResolvedValue({}),
  auditDiff: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/customerNotifications', () => ({
  notifyCustomerStatusChange: vi.fn().mockResolvedValue({}),
  sendWarrantySms: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/webhooks', () => ({
  fireWebhooks: vi.fn().mockResolvedValue({}),
}));

// Mock Rate Limiting
vi.mock('@/lib/rateLimit', () => ({
  rateLimiter: {
    check: vi.fn().mockResolvedValue({
      isLimited: false,
      remaining: 50,
      resetTime: Date.now() + 300000,
      retryAfter: 0,
    }),
  },
  getClientIP: () => '127.0.0.1',
  RATE_LIMITS: {
    MODERATE: { maxRequests: 50, windowMs: 300000 },
  },
}));

describe('Jobs API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupMockSession = (userId: string, role: 'admin' | 'reception' | 'engineer') => {
    getMock.mockImplementation((name: string) => {
      if (name === 'fixhub_session') return { name, value: 'session-token-123' };
      if (name === 'fixhub_csrf') return { name, value: 'csrf-token-123' };
      return undefined;
    });

    vi.mocked(prisma.session.findUnique).mockResolvedValue({
      token: 'session-token-123',
      userId,
      expiresAt: new Date(Date.now() + 3600000),
      idleAt: new Date(Date.now() + 3600000),
      createdAt: new Date(),
      payload: {
        id: userId,
        email: 'user@example.com',
        name: 'Test User',
        role,
        isActive: true,
        csrfToken: 'csrf-token-123',
      } as any,
    });
  };

  it('GET /api/jobs: restricts engineer to their own assigned jobs only', async () => {
    setupMockSession('engineer-1', 'engineer');
    vi.mocked(prisma.job.findMany).mockResolvedValue([]);
    vi.mocked(prisma.job.count).mockResolvedValue(0);

    const req = new Request('http://localhost/api/jobs');
    const res = await GET(req);
    expect(res.status).toBe(200);

    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          engineerId: 'engineer-1',
        }),
      })
    );
  });

  it('GET /api/jobs: allows admin/reception to see all jobs or filter by engineerId', async () => {
    setupMockSession('admin-1', 'admin');
    vi.mocked(prisma.job.findMany).mockResolvedValue([]);
    vi.mocked(prisma.job.count).mockResolvedValue(0);

    const req = new Request('http://localhost/api/jobs?engineerId=engineer-99');
    const res = await GET(req);
    expect(res.status).toBe(200);

    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          engineerId: 'engineer-99',
        }),
      })
    );
  });

  it('POST /api/jobs: rejects creation if user is an engineer', async () => {
    setupMockSession('engineer-1', 'engineer');

    const req = new Request('http://localhost/api/jobs', {
      method: 'POST',
      headers: { 'x-csrf-token': 'csrf-token-123' },
      body: JSON.stringify({
        customerId: 'c-1',
        deviceId: 'd-1',
        problemDescription: 'Broken glass',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('You do not have permission to perform this action.');
  });

  it('PUT /api/jobs/[id]: blocks status update (e.g. In Progress) on unassigned job (Bug 8)', async () => {
    setupMockSession('admin-1', 'admin');

    // Job in DB is unassigned (engineerId = null)
    vi.mocked(prisma.job.findUnique).mockResolvedValue({
      id: 'job-1',
      customerId: 'c-1',
      deviceId: 'd-1',
      engineerId: null,
      status: 'New',
    } as any);

    const req = new Request('http://localhost/api/jobs/job-1', {
      method: 'PUT',
      headers: { 'x-csrf-token': 'csrf-token-123' },
      body: JSON.stringify({
        status: 'In Progress', // attempts to move unassigned job to In Progress
      }),
    });

    const res = await PUT(req, { params: Promise.resolve({ id: 'job-1' }) });
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error).toContain('An engineer must be assigned');
  });

  it('PATCH /api/jobs/[id]: allows engineer to set status to In Progress on their own job', async () => {
    setupMockSession('engineer-1', 'engineer');

    vi.mocked(prisma.job.findUnique).mockResolvedValue({
      id: 'job-2',
      customerId: 'c-1',
      deviceId: 'd-1',
      engineerId: 'engineer-1',
      status: 'Assigned',
    } as any);

    vi.mocked(prisma.job.update).mockResolvedValue({
      id: 'job-2',
      customerId: 'c-1',
      deviceId: 'd-1',
      engineerId: 'engineer-1',
      status: 'In Progress',
      problemDesc: 'Cracked screen',
      createdAt: new Date(),
      updatedAt: new Date(),
      activities: [],
    } as any);

    const req = new Request('http://localhost/api/jobs/job-2', {
      method: 'PATCH',
      headers: { 'x-csrf-token': 'csrf-token-123' },
      body: JSON.stringify({
        status: 'In Progress',
      }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: 'job-2' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('In Progress');
  });

  it('PATCH /api/jobs/[id]: blocks engineer from completing a job with pending part requests (Bug 9)', async () => {
    setupMockSession('engineer-1', 'engineer');

    vi.mocked(prisma.job.findUnique).mockResolvedValue({
      id: 'job-3',
      customerId: 'c-1',
      deviceId: 'd-1',
      engineerId: 'engineer-1',
      status: 'In Progress',
    } as any);

    // Mock that a part request is pending
    vi.mocked(prisma.partRequest.findFirst).mockResolvedValue({
      id: 'part-1',
      partName: 'Replacement Screen',
    } as any);

    const req = new Request('http://localhost/api/jobs/job-3', {
      method: 'PATCH',
      headers: { 'x-csrf-token': 'csrf-token-123' },
      body: JSON.stringify({
        status: 'Completed',
      }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: 'job-3' }) });
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error).toContain('part request "Replacement Screen" is still pending approval');
  });

  it('DELETE /api/jobs/[id]: blocks job deletion if job is In Progress', async () => {
    setupMockSession('admin-1', 'admin');

    vi.mocked(prisma.job.findUnique).mockResolvedValue({
      id: 'job-4',
      status: 'In Progress',
    } as any);

    const req = new Request('http://localhost/api/jobs/job-4', {
      method: 'DELETE',
      headers: { 'x-csrf-token': 'csrf-token-123' },
    });

    const res = await DELETE(req, { params: Promise.resolve({ id: 'job-4' }) });
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain('Cannot delete a job that is In Progress');
  });
});

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    job: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
    },
    device: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  requireSession: vi.fn(),
  checkLengths: vi.fn().mockReturnValue(null),
  LIMITS: { notes: 2000 },
}));

vi.mock('@/lib/customerNotifications', () => ({
  notifyCustomerStatusChange: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/auditLog', () => ({
  writeAuditLog: vi.fn().mockResolvedValue({}),
  auditDiff: vi.fn().mockResolvedValue({}),
  queryAuditLogs: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
}));

describe('Jobs API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET returns paginated list of jobs', async () => {
    vi.mocked(requireSession).mockResolvedValue({
      user: { id: 'admin-1', role: 'admin', name: 'Admin', isActive: true },
    } as any);

    const mockJobs = [
      {
        id: 'job-1',
        customerId: 'c-1',
        deviceId: 'd-1',
        engineerId: 'eng-1',
        status: 'New',
        problemDesc: 'Screen cracked',
        estimatedCost: 1500,
        createdAt: new Date(),
        updatedAt: new Date(),
        activities: [],
        photos: [],
      },
    ];
    vi.mocked(prisma.job.findMany).mockResolvedValue(mockJobs as any);
    vi.mocked(prisma.job.count).mockResolvedValue(1);

    const req = new Request('http://localhost/api/jobs?page=1&limit=10');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.jobs).toHaveLength(1);
    expect(data.jobs[0].problemDescription).toBe('Screen cracked');
    expect(data.total).toBe(1);
  });

  it('POST creates a job successfully', async () => {
    vi.mocked(requireSession).mockResolvedValue({
      user: { id: 'admin-1', role: 'admin', name: 'Admin', isActive: true },
    } as any);

    const mockJob = {
      id: 'job-2',
      customerId: 'c-2',
      deviceId: 'd-2',
      engineerId: 'eng-2',
      status: 'Assigned',
      problemDesc: 'Battery swollen',
      estimatedCost: 2000,
      createdAt: new Date(),
      updatedAt: new Date(),
      activities: [],
    };
    vi.mocked(prisma.job.create).mockResolvedValue(mockJob as any);
    vi.mocked(prisma.customer.findUnique).mockResolvedValue({ id: 'c-2', name: 'Ravi', phone: '9876543210' } as any);
    vi.mocked(prisma.device.findUnique).mockResolvedValue({ id: 'd-2', type: 'Smartphone', brand: 'OnePlus', model: 'Nord' } as any);

    const req = new Request('http://localhost/api/jobs', {
      method: 'POST',
      body: JSON.stringify({
        customerId: 'c-2',
        deviceId: 'd-2',
        problemDescription: 'Battery swollen',
        status: 'Assigned',
        assignedEngineerId: 'eng-2',
        estimatedCost: 2000,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.problemDescription).toBe('Battery swollen');
  });
});

import { vi } from 'vitest';

vi.mock('./prisma', () => {
  return {
    prisma: {
      syncOutboxLedger: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      branch: {
        update: vi.fn().mockResolvedValue({}),
      },
      configDirective: {
        findMany: vi.fn(),
      },
      job: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
      },
    },
  };
});

import { describe, expect, it, beforeEach } from 'vitest';
import { prisma } from './prisma';
import { processBranchSyncPayload } from './hqSyncEngine';

describe('HQ Sync Engine', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default resolve for branch update
    vi.mocked(prisma.branch.update).mockResolvedValue({} as any);
  });

  it('successfully processes changes from branch and returns directives', async () => {
    // Mock ledger to exist and have lastSeq = 5
    vi.mocked(prisma.syncOutboxLedger.findUnique).mockResolvedValue({
      id: 'ledger-1',
      branchId: 'branch-1',
      lastSeq: 5n,
      updatedAt: new Date(),
    } as any);

    // Mock directives retrieval
    vi.mocked(prisma.configDirective.findMany).mockResolvedValue([
      {
        id: 'dir-1',
        directiveType: 'sla_tiers',
        payload: { tiers: [] },
        seq: 10n,
        createdAt: new Date(),
      },
    ] as any);

    // Mock job checks
    vi.mocked(prisma.job.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.job.create).mockResolvedValue({ id: 'job-123' } as any);

    const changes = [
      {
        id: 'change-1',
        entityType: 'Job',
        entityId: 'job-123',
        action: 'create',
        payload: { id: 'job-123', problemDesc: 'Broken screen' },
        seq: '6',
        createdAt: new Date(),
      },
    ];

    const result = await processBranchSyncPayload('branch-1', changes, '5');

    expect(result.success).toBe(true);
    expect(result.directives?.length).toBe(1);
    expect(result.directives?.[0].seq).toBe('10');

    // Should create the job
    expect(prisma.job.create).toHaveBeenCalledWith({
      data: {
        id: 'job-123',
        problemDesc: 'Broken screen',
        branchId: 'branch-1',
      },
    });

    // Should update ledger to seq 6
    expect(prisma.syncOutboxLedger.update).toHaveBeenCalledWith({
      where: { branchId: 'branch-1' },
      data: { lastSeq: 6n },
    });
  });

  it('rejects changes with sequence numbers less than or equal to lastSeq (Idempotency)', async () => {
    vi.mocked(prisma.syncOutboxLedger.findUnique).mockResolvedValue({
      id: 'ledger-1',
      branchId: 'branch-1',
      lastSeq: 10n,
      updatedAt: new Date(),
    } as any);

    vi.mocked(prisma.configDirective.findMany).mockResolvedValue([]);

    const changes = [
      {
        id: 'change-1',
        entityType: 'Job',
        entityId: 'job-123',
        action: 'create',
        payload: { id: 'job-123', problemDesc: 'Old description' },
        seq: '10', // Already processed since seq <= 10
        createdAt: new Date(),
      },
    ];

    const result = await processBranchSyncPayload('branch-1', changes, '5');

    expect(result.success).toBe(true);
    expect(prisma.job.create).not.toHaveBeenCalled();
    expect(prisma.syncOutboxLedger.update).not.toHaveBeenCalled();
  });

  it('resolves concurrent/out-of-order updates using LWW (Last-Write-Wins)', async () => {
    vi.mocked(prisma.syncOutboxLedger.findUnique).mockResolvedValue({
      id: 'ledger-1',
      branchId: 'branch-1',
      lastSeq: 5n,
      updatedAt: new Date(),
    } as any);

    // Existing job at HQ has updatedAt = 2026-06-16T12:00:00
    vi.mocked(prisma.job.findUnique).mockResolvedValue({
      id: 'job-123',
      problemDesc: 'HQ version',
      updatedAt: new Date('2026-06-16T12:00:00.000Z'),
    } as any);

    vi.mocked(prisma.configDirective.findMany).mockResolvedValue([]);

    // 1. Pushed change has OLDER updatedAt (2026-06-16T11:00:00)
    const oldChange = [
      {
        id: 'change-1',
        entityType: 'Job',
        entityId: 'job-123',
        action: 'update',
        payload: { id: 'job-123', problemDesc: 'Branch old version', updatedAt: '2026-06-16T11:00:00.000Z' },
        seq: '6',
        createdAt: new Date(),
      },
    ];

    await processBranchSyncPayload('branch-1', oldChange, '0');
    expect(prisma.job.update).not.toHaveBeenCalled(); // Should NOT update

    // 2. Pushed change has NEWER updatedAt (2026-06-16T13:00:00)
    const newChange = [
      {
        id: 'change-2',
        entityType: 'Job',
        entityId: 'job-123',
        action: 'update',
        payload: { id: 'job-123', problemDesc: 'Branch new version', updatedAt: '2026-06-16T13:00:00.000Z' },
        seq: '7',
        createdAt: new Date(),
      },
    ];

    await processBranchSyncPayload('branch-1', newChange, '0');
    expect(prisma.job.update).toHaveBeenCalledWith({
      where: { id: 'job-123' },
      data: { problemDesc: 'Branch new version', updatedAt: '2026-06-16T13:00:00.000Z', branchId: 'branch-1' },
    });
  });
});

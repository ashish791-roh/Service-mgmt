import dotenv from 'dotenv';
import path from 'path';

// Load environment variables before importing prisma
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

let prisma: any;

describe('Database Optimizations — Soft Delete Extension', () => {
  let testCustomerId: string;
  let testJobId: string;

  beforeAll(async () => {
    const prismaModule = await import('@/lib/prisma');
    prisma = prismaModule.prisma;

    // Create a customer and job for testing soft-delete
    const customer = await prisma.customer.create({
      data: {
        name: 'Soft Delete Test Customer',
        phone: '1112223333',
        email: 'soft-delete-test@fixhub.com',
        branchId: 'test-branch',
      },
    });
    testCustomerId = customer.id;

    // Create a device
    const device = await prisma.device.create({
      data: {
        customerId: testCustomerId,
        type: 'Phone',
        brand: 'Test Brand',
        model: 'Test Model',
        branchId: 'test-branch',
      },
    });

    const job = await prisma.job.create({
      data: {
        customerId: testCustomerId,
        deviceId: device.id,
        problemDesc: 'Soft Delete Test Job',
        status: 'New',
        branchId: 'test-branch',
      },
    });
    testJobId = job.id;
  });

  afterAll(async () => {
    // Clean up using direct SQL to physically purge records
    const { pgPool } = await import('@/lib/prisma');
    await pgPool.query('DELETE FROM "Job" WHERE "branchId" = $1', ['test-branch']);
    await pgPool.query('DELETE FROM "Device" WHERE "branchId" = $1', ['test-branch']);
    await pgPool.query('DELETE FROM "Customer" WHERE "branchId" = $1', ['test-branch']);
  });

  it('should find active customer and job by default', async () => {
    const customer = await prisma.customer.findUnique({
      where: { id: testCustomerId },
    });
    expect(customer).not.toBeNull();
    expect(customer?.deletedAt).toBeNull();

    const job = await prisma.job.findUnique({
      where: { id: testJobId },
    });
    expect(job).not.toBeNull();
    expect(job?.deletedAt).toBeNull();
  });

  it('should intercept delete and perform soft-delete', async () => {
    // Perform standard delete call
    await prisma.job.delete({
      where: { id: testJobId },
    });

    // Verify it is not found by default findUnique
    const jobDefault = await prisma.job.findUnique({
      where: { id: testJobId },
    });
    expect(jobDefault).toBeNull();

    // Verify it still exists in the database with deletedAt populated by bypassing the filter
    const jobSoftDeleted = await prisma.job.findFirst({
      where: {
        id: testJobId,
        deletedAt: { not: null },
      },
    });
    expect(jobSoftDeleted).not.toBeNull();
    expect(jobSoftDeleted?.deletedAt).toBeInstanceOf(Date);
  });

  it('should support soft-deleting customers', async () => {
    await prisma.customer.delete({
      where: { id: testCustomerId },
    });

    const customerDefault = await prisma.customer.findUnique({
      where: { id: testCustomerId },
    });
    expect(customerDefault).toBeNull();

    const customerSoftDeleted = await prisma.customer.findFirst({
      where: {
        id: testCustomerId,
        deletedAt: { not: null },
      },
    });
    expect(customerSoftDeleted).not.toBeNull();
    expect(customerSoftDeleted?.deletedAt).toBeInstanceOf(Date);
  });
});

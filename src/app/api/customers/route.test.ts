import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    customer: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  requireSession: vi.fn(),
  checkLengths: vi.fn().mockReturnValue(null),
  LIMITS: { name: 100, phone: 20, email: 100, address: 200 },
}));

vi.mock('@/lib/auditLog', () => ({
  writeAuditLog: vi.fn().mockResolvedValue({}),
}));

describe('Customers API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET returns paginated list of customers', async () => {
    vi.mocked(requireSession).mockResolvedValue({
      user: { id: 'admin-1', role: 'admin', name: 'Admin', isActive: true },
    } as any);

    const mockCustomers = [
      { id: '1', name: 'Cust 1', phone: '9876543210', address: 'Addr 1', createdAt: new Date(), updatedAt: new Date() },
    ];
    vi.mocked(prisma.customer.findMany).mockResolvedValue(mockCustomers as any);
    vi.mocked(prisma.customer.count).mockResolvedValue(1);

    const req = new Request('http://localhost/api/customers?page=1&limit=20');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.customers).toHaveLength(1);
    expect(data.total).toBe(1);
  });

  it('POST registers a new customer', async () => {
    vi.mocked(requireSession).mockResolvedValue({
      user: { id: 'admin-1', role: 'admin', name: 'Admin', isActive: true },
    } as any);

    vi.mocked(prisma.customer.findFirst).mockResolvedValue(null);
    const mockCustomer = { id: '2', name: 'Cust 2', phone: '9876543211', address: 'Addr 2', createdAt: new Date(), updatedAt: new Date() };
    vi.mocked(prisma.customer.create).mockResolvedValue(mockCustomer as any);

    const req = new Request('http://localhost/api/customers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Cust 2', phone: '9876543211', address: 'Addr 2' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe('Cust 2');
  });
});

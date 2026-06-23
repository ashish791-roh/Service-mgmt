import { describe, expect, it, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { GET, POST, PUT } from './route';

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
    session: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    customer: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    job: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock Audit Log
vi.mock('@/lib/auditLog', () => ({
  writeAuditLog: vi.fn().mockResolvedValue({}),
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

describe('Customers API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupMockSession = (role: 'admin' | 'reception' | 'engineer', isActive: boolean = true) => {
    // Configure getMock to return correct tokens
    getMock.mockImplementation((name: string) => {
      if (name === 'fixhub_session') return { name, value: 'session-token-123' };
      if (name === 'fixhub_csrf') return { name, value: 'csrf-token-123' };
      return undefined;
    });

    // Mock session record in prisma
    vi.mocked(prisma.session.findUnique).mockResolvedValue({
      token: 'session-token-123',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 3600000), // 1 hour expiry
      idleAt: new Date(Date.now() + 3600000),
      createdAt: new Date(),
      payload: {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        role,
        isActive,
        csrfToken: 'csrf-token-123',
      } as any,
    });

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
      role,
      isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
      branchId: 'default',
    } as any);
  };

  it('GET block: returns 401 when no session cookie is present', async () => {
    getMock.mockReturnValue(undefined);

    const req = new Request('http://localhost/api/customers');
    const res = await GET(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Authentication required.');
  });

  it('GET block: returns 401 when session is expired in database', async () => {
    setupMockSession('admin');
    vi.mocked(prisma.session.findUnique).mockResolvedValue({
      token: 'session-token-123',
      userId: 'user-1',
      expiresAt: new Date(Date.now() - 1000), // expired 1s ago
      idleAt: new Date(),
      createdAt: new Date(),
      payload: {},
    } as any);

    const req = new Request('http://localhost/api/customers');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('GET block: returns 403 when account is disabled', async () => {
    setupMockSession('admin', false); // disabled

    const req = new Request('http://localhost/api/customers');
    const res = await GET(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('Account is disabled.');
  });

  it('PUT block: returns 403 when user role is not authorized (engineer tries to update customer)', async () => {
    setupMockSession('engineer');

    const req = new Request('http://localhost/api/customers?id=cust-1', {
      method: 'PUT',
      headers: { 'x-csrf-token': 'csrf-token-123' },
      body: JSON.stringify({ name: 'Valid Name', phone: '9876543210' }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('You do not have permission to perform this action.');
  });

  it('Mutating block: returns 403 when x-csrf-token is missing', async () => {
    setupMockSession('admin');

    const req = new Request('http://localhost/api/customers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Valid Name', phone: '9876543210' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('Invalid or missing CSRF token.');
  });

  it('Mutating block: returns 403 when x-csrf-token does not match stored token', async () => {
    setupMockSession('admin');

    const req = new Request('http://localhost/api/customers', {
      method: 'POST',
      headers: { 'x-csrf-token': 'wrong-csrf-token' },
      body: JSON.stringify({ name: 'Valid Name', phone: '9876543210' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('POST block: performs validation and returns 400 for invalid inputs', async () => {
    setupMockSession('admin');

    // Mismatched phone E.164 rule check
    const req = new Request('http://localhost/api/customers', {
      method: 'POST',
      headers: { 'x-csrf-token': 'csrf-token-123' },
      body: JSON.stringify({ name: 'A', phone: 'invalid-phone-number' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Name must be at least 2 characters.'); // checks name length first
  });

  it('POST block: returns 409 when phone number already exists', async () => {
    setupMockSession('admin');

    vi.mocked(prisma.customer.findFirst).mockResolvedValue({ id: 'existing-id', name: 'Original Name' } as any);

    const req = new Request('http://localhost/api/customers', {
      method: 'POST',
      headers: { 'x-csrf-token': 'csrf-token-123' },
      body: JSON.stringify({ name: 'New Cust', phone: '9876543210' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain('already exists');
  });

  it('GET pagination: defaults to page 1 and limit 20', async () => {
    setupMockSession('engineer');
    vi.mocked(prisma.customer.findMany).mockResolvedValue([]);
    vi.mocked(prisma.customer.count).mockResolvedValue(0);

    const req = new Request('http://localhost/api/customers');
    const res = await GET(req);
    expect(res.status).toBe(200);

    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 20,
        skip: 0,
      })
    );
  });
});

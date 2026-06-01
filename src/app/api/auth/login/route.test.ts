import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST, DELETE } from './route';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    session: {
      create: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

const getMock = vi.fn();
const setMock = vi.fn();

vi.mock('next/headers', () => {
  return {
    cookies: vi.fn().mockImplementation(async () => ({
      get: getMock,
      set: setMock,
    })),
  };
});

describe('Auth Login API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects missing credentials with 400', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Email and password are required');
  });

  it('rejects invalid password with 401', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashedpassword',
      role: 'admin',
      isActive: true,
    };
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
    vi.spyOn(bcrypt, 'compare').mockImplementation(async () => false);

    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'wrong' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Invalid email or password.');
  });

  it('logs in successfully with correct credentials', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashedpassword',
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
    };
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
    vi.spyOn(bcrypt, 'compare').mockImplementation(async () => true);
    vi.mocked(prisma.session.create).mockResolvedValue({} as any);

    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'correct' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.name).toBe('Test User');
  });

  it('performs logout successfully on DELETE', async () => {
    getMock.mockReturnValue({ value: 'some-token' });
    const res = await DELETE();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});

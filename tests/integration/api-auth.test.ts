import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/lib/db';

// Mock next/headers
const mockCookieStore = {
  get: vi.fn(() => undefined),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
  headers: vi.fn(() => Promise.resolve({
    get: vi.fn(() => null),
  })),
}));

describe('auth API integration', () => {
  describe('POST /api/auth/signup', () => {
    it('signup handler exports POST', async () => {
      const mod = await import('@/app/api/auth/signup/route');
      expect(mod.POST).toBeDefined();
    });

    it('rejects missing email', async () => {
      const mod = await import('@/app/api/auth/signup/route');
      const request = new Request('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'ValidPass123!' }),
      });

      const response = await mod.POST(request);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('rejects invalid email format', async () => {
      const mod = await import('@/app/api/auth/signup/route');
      const request = new Request('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'not-an-email',
          password: 'ValidPass123!',
        }),
      });

      const response = await mod.POST(request);
      expect(response.status).toBe(400);
    });

    it('rejects short password', async () => {
      const mod = await import('@/app/api/auth/signup/route');
      const request = new Request('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
          password: 'short',
        }),
      });

      const response = await mod.POST(request);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('creates user with valid data', async () => {
      const mod = await import('@/app/api/auth/signup/route');
      const request = new Request('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'newuser@example.com',
          name: 'New User',
          password: 'SecurePassword123!',
        }),
      });

      const response = await mod.POST(request);
      const data = await response.json();

      expect([200, 201]).toContain(response.status);
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe('newuser@example.com');
      expect(data.user.name).toBe('New User');
      // Should not expose password hash
      expect(data.user.passwordHash).toBeUndefined();
    });

    it('rejects duplicate email', async () => {
      const mod = await import('@/app/api/auth/signup/route');

      // Create first user
      db.collection<any>('users').create({
        email: 'existing@example.com',
        name: 'Existing',
        passwordHash: 'hash',
        slug: 'existing',
        timezone: 'UTC',
        locale: 'en',
        onboardingComplete: false,
        orgRole: '',
      });

      const request = new Request('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'existing@example.com',
          name: 'Another User',
          password: 'SecurePassword123!',
        }),
      });

      const response = await mod.POST(request);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('login handler exports POST', async () => {
      const mod = await import('@/app/api/auth/login/route');
      expect(mod.POST).toBeDefined();
    });

    it('rejects missing credentials', async () => {
      const mod = await import('@/app/api/auth/login/route');
      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await mod.POST(request);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('rejects wrong password', async () => {
      const { hashPassword } = await import('@/lib/auth');
      const hash = await hashPassword('correct-pass');

      db.collection<any>('users').create({
        email: 'login-test@example.com',
        name: 'Login User',
        passwordHash: hash,
        slug: 'login-test',
        timezone: 'UTC',
        locale: 'en',
        onboardingComplete: true,
        orgRole: 'owner',
      });

      const mod = await import('@/app/api/auth/login/route');
      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'login-test@example.com',
          password: 'wrong-pass',
        }),
      });

      const response = await mod.POST(request);
      expect(response.status).toBe(401);
    });

    it('rejects invalid email format', async () => {
      const mod = await import('@/app/api/auth/login/route');
      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'bad-email',
          password: 'whatever',
        }),
      });

      const response = await mod.POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('exports POST handler', async () => {
      const mod = await import('@/app/api/auth/logout/route');
      expect(mod.POST).toBeDefined();
    });
  });

  describe('GET /api/auth/me', () => {
    it('exports GET handler', async () => {
      const mod = await import('@/app/api/auth/me/route');
      expect(mod.GET).toBeDefined();
    });

    it('returns 401 when no session', async () => {
      const mod = await import('@/app/api/auth/me/route');
      const response = await mod.GET();
      expect(response.status).toBe(401);
    });
  });
});

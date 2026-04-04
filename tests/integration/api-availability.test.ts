import { describe, it, expect, vi } from 'vitest';
import { db } from '@/lib/db';

let mockSessionToken: string | undefined;

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({
    get: vi.fn((name: string) => {
      if (name === 'session' && mockSessionToken) {
        return { value: mockSessionToken };
      }
      return undefined;
    }),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(() => Promise.resolve({
    get: vi.fn(() => null),
  })),
}));

vi.mock('@/lib/google-calendar', () => ({
  getGoogleCalendarBusyIntervals: vi.fn(() => Promise.resolve([])),
  hasBusyIntervalConflict: vi.fn(() => false),
  hasGoogleCalendarConflict: vi.fn(() => Promise.resolve(false)),
}));

async function setupAuthUser() {
  const { hashPassword, generateToken } = await import('@/lib/auth');

  const user = db.collection<any>('users').create({
    email: `avail-${Date.now()}@example.com`,
    name: 'Avail User',
    passwordHash: await hashPassword('TestPass123!'),
    slug: `avail-user-${Date.now()}`,
    timezone: 'America/New_York',
    locale: 'en',
    onboardingComplete: true,
    orgRole: 'owner',
  });

  const token = generateToken({ userId: user.id, type: 'session' });
  db.collection<any>('sessions').create({
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  mockSessionToken = token;
  return user;
}

describe('availability API integration', () => {
  describe('GET /api/availability', () => {
    it('returns 401 without auth', async () => {
      mockSessionToken = undefined;
      const mod = await import('@/app/api/availability/route');
      const request = new Request('http://localhost:3000/api/availability');
      const response = await mod.GET(request);
      expect(response.status).toBe(401);
    });

    it('returns schedules for authenticated user', async () => {
      await setupAuthUser();
      const mod = await import('@/app/api/availability/route');
      const request = new Request('http://localhost:3000/api/availability');
      const response = await mod.GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.schedules).toBeDefined();
    });
  });

  describe('POST /api/availability', () => {
    it('creates a new schedule', async () => {
      await setupAuthUser();
      const mod = await import('@/app/api/availability/route');

      const request = new Request('http://localhost:3000/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Evening Hours',
          timezone: 'America/New_York',
          rules: [
            { dayOfWeek: 1, startTime: '18:00', endTime: '21:00', isEnabled: true },
            { dayOfWeek: 2, startTime: '18:00', endTime: '21:00', isEnabled: true },
          ],
        }),
      });

      const response = await mod.POST(request);
      expect([200, 201]).toContain(response.status);
      const data = await response.json();
      expect(data.schedule).toBeDefined();
      expect(data.schedule.name).toBe('Evening Hours');
    });
  });
});

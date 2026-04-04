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

  const org = db.collection<any>('organizations').create({
    name: 'Test Org',
    slug: `org-${Date.now()}`,
    plan: 'standard',
    planSeats: 5,
  });

  const user = db.collection<any>('users').create({
    email: `routing-${Date.now()}@example.com`,
    name: 'Routing User',
    passwordHash: await hashPassword('TestPass123!'),
    slug: `routing-user-${Date.now()}`,
    timezone: 'America/New_York',
    locale: 'en',
    onboardingComplete: true,
    orgRole: 'owner',
    organizationId: org.id,
  });

  const token = generateToken({ userId: user.id, type: 'session' });
  db.collection<any>('sessions').create({
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  mockSessionToken = token;
  return { user, org };
}

describe('routing forms API integration', () => {
  describe('GET /api/routing-forms', () => {
    it('returns 401 without auth', async () => {
      mockSessionToken = undefined;
      const mod = await import('@/app/api/routing-forms/route');
      const request = new Request('http://localhost:3000/api/routing-forms');
      const response = await mod.GET(request);
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/routing-forms', () => {
    it('creates a routing form', async () => {
      await setupAuthUser();
      const mod = await import('@/app/api/routing-forms/route');

      const request = new Request('http://localhost:3000/api/routing-forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Sales Routing',
          fields: [
            { id: 'company-size', label: 'Company Size', type: 'select', required: true, options: ['1-10', '11-50', '51-200', '200+'] },
          ],
          routes: [
            {
              id: 'route-1',
              conditions: [{ fieldId: 'company-size', operator: 'equals', value: '200+' }],
              logic: 'and',
              destination: { type: 'message', value: 'Enterprise team will contact you' },
            },
          ],
          fallbackType: 'message',
          fallbackValue: 'Please contact sales@example.com',
        }),
      });

      const response = await mod.POST(request);
      expect([200, 201]).toContain(response.status);
      const data = await response.json();
      expect(data.routingForm).toBeDefined();
      expect(data.routingForm.name).toBe('Sales Routing');
    });

    it('rejects unsafe external fallback URLs', async () => {
      await setupAuthUser();
      const mod = await import('@/app/api/routing-forms/route');

      const request = new Request('http://localhost:3000/api/routing-forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Unsafe Routing',
          fallbackType: 'external_url',
          fallbackValue: 'javascript:alert(1)',
        }),
      });

      const response = await mod.POST(request);
      expect(response.status).toBe(400);
    });
  });
});

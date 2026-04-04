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

async function setupAuthUser(plan = 'free') {
  const { hashPassword, generateToken } = await import('@/lib/auth');

  const org = db.collection<any>('organizations').create({
    name: 'Billing Org',
    slug: `billing-org-${Date.now()}`,
    plan,
    planSeats: 5,
    stripeCustomerId: 'cus_test123',
    stripeSubscriptionId: '',
  });

  const user = db.collection<any>('users').create({
    email: `billing-${Date.now()}@example.com`,
    name: 'Billing User',
    passwordHash: await hashPassword('TestPass123!'),
    slug: `billing-user-${Date.now()}`,
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

describe('billing API integration', () => {
  describe('POST /api/billing/plan', () => {
    it('returns 401 without auth', async () => {
      mockSessionToken = undefined;
      const mod = await import('@/app/api/billing/plan/route');
      const request = new Request('http://localhost:3000/api/billing/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'free' }),
      });
      const response = await mod.POST(request);
      expect(response.status).toBe(401);
    });

    it('allows downgrade to free plan', async () => {
      const { org } = await setupAuthUser('standard');
      const mod = await import('@/app/api/billing/plan/route');

      const request = new Request('http://localhost:3000/api/billing/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'free' }),
      });

      const response = await mod.POST(request);
      expect(response.status).toBe(200);

      // Verify org was updated
      const updatedOrg = db.collection<any>('organizations').findById(org.id);
      expect(updatedOrg!.plan).toBe('free');
    });

    it('allows switch to teams_free plan', async () => {
      const { org } = await setupAuthUser('free');
      const mod = await import('@/app/api/billing/plan/route');

      const request = new Request('http://localhost:3000/api/billing/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'teams_free' }),
      });

      const response = await mod.POST(request);
      expect(response.status).toBe(200);

      const updatedOrg = db.collection<any>('organizations').findById(org.id);
      expect(updatedOrg!.plan).toBe('teams_free');
    });
  });
});

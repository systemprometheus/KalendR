import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/lib/db';

// Mock next/headers with a session
let mockSessionToken: string | undefined;
let mockUserId: string;

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

// Mock google-calendar
vi.mock('@/lib/google-calendar', () => ({
  getGoogleCalendarBusyIntervals: vi.fn(() => Promise.resolve([])),
  hasBusyIntervalConflict: vi.fn(() => false),
  hasGoogleCalendarConflict: vi.fn(() => Promise.resolve(false)),
  createGoogleCalendarEventForBooking: vi.fn(() => Promise.resolve(null)),
  ensureGoogleCalendarWatches: vi.fn(() => Promise.resolve()),
}));

// Mock email
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(() => Promise.resolve(true)),
  bookingConfirmationEmail: vi.fn(() => ({ to: '', subject: '', html: '', text: '' })),
  hostNotificationEmail: vi.fn(() => ({ to: '', subject: '', html: '', text: '' })),
}));

async function createAuthenticatedUser() {
  const { hashPassword, generateToken, createSession } = await import('@/lib/auth');

  const user = db.collection<any>('users').create({
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    passwordHash: await hashPassword('TestPass123!'),
    slug: `test-user-${Date.now()}`,
    timezone: 'America/New_York',
    locale: 'en',
    onboardingComplete: true,
    orgRole: 'owner',
  });

  const org = db.collection<any>('organizations').create({
    name: 'Test Org',
    slug: `test-org-${Date.now()}`,
    plan: 'free',
    planSeats: 1,
  });

  db.collection<any>('users').update(user.id, { organizationId: org.id });

  const token = generateToken({ userId: user.id, type: 'session' });
  db.collection<any>('sessions').create({
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  mockSessionToken = token;
  mockUserId = user.id;

  return { user: { ...user, organizationId: org.id }, org, token };
}

describe('event-types API integration', () => {
  describe('GET /api/event-types', () => {
    it('returns 401 without auth', async () => {
      mockSessionToken = undefined;
      const mod = await import('@/app/api/event-types/route');
      const request = new Request('http://localhost:3000/api/event-types');
      const response = await mod.GET(request as any);
      expect(response.status).toBe(401);
    });

    it('returns empty list for new user', async () => {
      await createAuthenticatedUser();
      const mod = await import('@/app/api/event-types/route');
      const request = new Request('http://localhost:3000/api/event-types');
      const response = await mod.GET(request as any);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.eventTypes).toBeDefined();
      expect(Array.isArray(data.eventTypes)).toBe(true);
    });
  });

  describe('POST /api/event-types', () => {
    it('creates an event type with valid data', async () => {
      const { user } = await createAuthenticatedUser();
      const mod = await import('@/app/api/event-types/route');

      const request = new Request('http://localhost:3000/api/event-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '30 Min Meeting',
          slug: 'thirty-min',
          duration: 30,
          locationType: 'google_meet',
        }),
      });

      const response = await mod.POST(request as any);
      expect([200, 201]).toContain(response.status);
      const data = await response.json();
      expect(data.eventType).toBeDefined();
      expect(data.eventType.title).toBe('30 Min Meeting');
      expect(data.eventType.duration).toBe(30);
      expect(data.eventType.isActive).toBe(true);
    });

    it('rejects event type without title', async () => {
      await createAuthenticatedUser();
      const mod = await import('@/app/api/event-types/route');

      const request = new Request('http://localhost:3000/api/event-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: 30,
          locationType: 'google_meet',
        }),
      });

      const response = await mod.POST(request);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('drops invalid redirect URLs', async () => {
      await createAuthenticatedUser();
      const mod = await import('@/app/api/event-types/route');

      const request = new Request('http://localhost:3000/api/event-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Redirect Test',
          redirectUrl: 'javascript:alert(1)',
        }),
      });

      const response = await mod.POST(request);
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.eventType.redirectUrl).toBeNull();
    });
  });
});

describe('bookings API integration', () => {
  describe('GET /api/bookings', () => {
    it('returns 401 without auth', async () => {
      mockSessionToken = undefined;
      const mod = await import('@/app/api/bookings/route');
      const request = new Request('http://localhost:3000/api/bookings');
      const response = await mod.GET(request as any);
      expect(response.status).toBe(401);
    });

    it('returns bookings list for authenticated user', async () => {
      await createAuthenticatedUser();
      const mod = await import('@/app/api/bookings/route');
      const request = new Request('http://localhost:3000/api/bookings');
      const response = await mod.GET(request as any);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.bookings).toBeDefined();
      expect(Array.isArray(data.bookings)).toBe(true);
    });
  });

  describe('POST /api/bookings', () => {
    it('rejects booking without required fields', async () => {
      await createAuthenticatedUser();
      const mod = await import('@/app/api/bookings/route');

      const request = new Request('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await mod.POST(request as any);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('does not expose cancel or reschedule tokens from booking lookup', async () => {
      const { user } = await createAuthenticatedUser();
      const eventType = db.collection<any>('event_types').create({
        userId: user.id,
        organizationId: user.organizationId,
        title: 'Demo',
        slug: 'demo',
        duration: 30,
        isActive: true,
        isArchived: false,
        locationType: 'google_meet',
      });

      const booking = db.collection<any>('bookings').create({
        uid: 'booking-123',
        eventTypeId: eventType.id,
        hostId: user.id,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        timezone: 'UTC',
        status: 'confirmed',
        inviteeName: 'Invitee',
        inviteeEmail: 'invitee@example.com',
        cancelToken: 'secret-cancel',
        rescheduleToken: 'secret-reschedule',
      });

      const detailMod = await import('@/app/api/bookings/[uid]/route');
      const response = await detailMod.GET(
        new Request(`http://localhost:3000/api/bookings/${booking.uid}`) as any,
        { params: Promise.resolve({ uid: booking.uid }) },
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.booking.cancelToken).toBeUndefined();
      expect(data.booking.rescheduleToken).toBeUndefined();
      expect(data.booking.inviteeEmail).toBe('invitee@example.com');
    });
  });
});

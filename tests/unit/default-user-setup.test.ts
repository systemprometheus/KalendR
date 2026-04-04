import { describe, it, expect, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({ get: () => undefined })),
  headers: vi.fn(() => Promise.resolve({ get: () => null })),
}));

import { db } from '@/lib/db';
import { ensureUserWorkspace } from '@/lib/default-user-setup';

describe('ensureUserWorkspace', () => {
  it('creates organization and sets user as owner if no org exists', () => {
    const user = db.collection<any>('users').create({
      name: 'Test User',
      email: 'test@example.com',
      timezone: 'America/New_York',
      slug: 'test-user',
      locale: 'en',
      onboardingComplete: false,
      orgRole: '',
    });

    const result = ensureUserWorkspace(user);
    expect(result.organizationId).toBeTruthy();
    expect(result.orgRole).toBe('owner');

    // Verify org was created
    const org = db.collection<any>('organizations').findById(result.organizationId!);
    expect(org).not.toBeNull();
    expect(org!.plan).toBe('free');
    expect(org!.planSeats).toBe(1);
  });

  it('does not create org if user already has one', () => {
    const org = db.collection<any>('organizations').create({
      name: 'Existing Org',
      slug: 'existing-org',
      plan: 'standard',
      planSeats: 5,
    });

    const user = db.collection<any>('users').create({
      name: 'Test User',
      email: 'test2@example.com',
      timezone: 'America/New_York',
      slug: 'test-user-2',
      locale: 'en',
      onboardingComplete: false,
      organizationId: org.id,
      orgRole: 'member',
    });

    const result = ensureUserWorkspace(user);
    expect(result.organizationId).toBe(org.id);

    // The user's org should still be the original one
    const userOrg = db.collection<any>('organizations').findById(result.organizationId!);
    expect(userOrg).not.toBeNull();
    expect(userOrg!.slug).toBe('existing-org');
  });

  it('creates default availability schedule for user', () => {
    const user = db.collection<any>('users').create({
      name: 'Avail User',
      email: 'avail@example.com',
      timezone: 'Europe/London',
      slug: 'avail-user',
      locale: 'en',
      onboardingComplete: false,
      orgRole: '',
    });

    ensureUserWorkspace(user);

    const schedules = db.collection<any>('availability_schedules').findMany({
      where: { userId: user.id },
    });
    expect(schedules.length).toBeGreaterThanOrEqual(1);
    expect(schedules[0].isDefault).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { db } from '@/lib/db';
import { ensureDefaultAvailabilitySchedule } from '@/lib/default-availability';

describe('ensureDefaultAvailabilitySchedule', () => {
  it('creates a new default schedule if none exists', () => {
    const schedule = ensureDefaultAvailabilitySchedule('user-1', 'America/New_York');
    expect(schedule).toBeTruthy();
    expect(schedule.isDefault).toBe(true);
    expect(schedule.userId).toBe('user-1');
    expect(schedule.timezone).toBe('America/New_York');
  });

  it('creates weekday rules (Mon-Fri 9-5)', () => {
    const schedule = ensureDefaultAvailabilitySchedule('user-2', 'America/New_York');
    const rules = db.collection<any>('availability_rules').findMany({
      where: { scheduleId: schedule.id },
    });
    // Should have 5 rules (Mon-Fri)
    const userRules = rules.filter((r: any) => r.isEnabled);
    expect(userRules).toHaveLength(5);

    for (const rule of userRules) {
      expect(rule.startTime).toBe('09:00');
      expect(rule.endTime).toBe('17:00');
      expect(rule.isEnabled).toBe(true);
      expect(rule.dayOfWeek).toBeGreaterThanOrEqual(1);
      expect(rule.dayOfWeek).toBeLessThanOrEqual(5);
    }
  });

  it('returns existing default schedule if one exists', () => {
    const first = ensureDefaultAvailabilitySchedule('user-3', 'America/New_York');
    const second = ensureDefaultAvailabilitySchedule('user-3', 'America/New_York');
    expect(second.id).toBe(first.id);
  });

  it('promotes first existing schedule to default if none marked default', () => {
    db.collection<any>('availability_schedules').create({
      name: 'Custom',
      userId: 'user-4',
      timezone: 'Europe/London',
      isDefault: false,
    });

    const schedule = ensureDefaultAvailabilitySchedule('user-4', 'America/New_York');
    expect(schedule.isDefault).toBe(true);
    expect(schedule.name).toBe('Custom');
  });

  it('uses provided timezone', () => {
    const schedule = ensureDefaultAvailabilitySchedule('user-5', 'Asia/Tokyo');
    expect(schedule.timezone).toBe('Asia/Tokyo');
  });

  it('defaults to America/New_York when no timezone given', () => {
    const schedule = ensureDefaultAvailabilitySchedule('user-6');
    expect(schedule.timezone).toBe('America/New_York');
  });
});

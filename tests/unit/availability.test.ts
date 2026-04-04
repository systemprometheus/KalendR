import { describe, it, expect, vi } from 'vitest';
import { db } from '@/lib/db';

// Mock google-calendar to avoid real API calls
vi.mock('@/lib/google-calendar', () => ({
  getGoogleCalendarBusyIntervals: vi.fn(() => Promise.resolve([])),
  hasBusyIntervalConflict: vi.fn(() => false),
  hasGoogleCalendarConflict: vi.fn(() => Promise.resolve(false)),
}));

import { getAvailabilityForDate } from '@/lib/availability';

describe('availability', () => {
  describe('getAvailabilityForDate', () => {
    it('returns empty array when override marks day unavailable', () => {
      const schedule = db.collection<any>('availability_schedules').create({
        name: 'Test',
        userId: 'user-1',
        timezone: 'America/New_York',
        isDefault: true,
      });

      db.collection<any>('availability_overrides').create({
        scheduleId: schedule.id,
        date: '2026-01-15',
        isUnavailable: true,
      });

      const windows = getAvailabilityForDate(schedule.id, '2026-01-15');
      expect(windows).toEqual([]);
    });

    it('returns override times when override provides times', () => {
      const schedule = db.collection<any>('availability_schedules').create({
        name: 'Test',
        userId: 'user-1',
        timezone: 'America/New_York',
        isDefault: true,
      });

      db.collection<any>('availability_overrides').create({
        scheduleId: schedule.id,
        date: '2026-01-15',
        isUnavailable: false,
        startTime: '10:00',
        endTime: '14:00',
      });

      const windows = getAvailabilityForDate(schedule.id, '2026-01-15');
      expect(windows).toEqual([{ startTime: '10:00', endTime: '14:00' }]);
    });

    it('returns rules for matching day of week', () => {
      const schedule = db.collection<any>('availability_schedules').create({
        name: 'Test',
        userId: 'user-1',
        timezone: 'America/New_York',
        isDefault: true,
      });

      // 2026-01-15 is a Thursday (dayOfWeek = 4)
      db.collection<any>('availability_rules').create({
        scheduleId: schedule.id,
        dayOfWeek: 4,
        startTime: '09:00',
        endTime: '17:00',
        isEnabled: true,
      });

      const windows = getAvailabilityForDate(schedule.id, '2026-01-15');
      expect(windows).toEqual([{ startTime: '09:00', endTime: '17:00' }]);
    });

    it('ignores disabled rules', () => {
      const schedule = db.collection<any>('availability_schedules').create({
        name: 'Test',
        userId: 'user-1',
        timezone: 'America/New_York',
        isDefault: true,
      });

      // 2026-01-15 is Thursday (dayOfWeek = 4)
      db.collection<any>('availability_rules').create({
        scheduleId: schedule.id,
        dayOfWeek: 4,
        startTime: '09:00',
        endTime: '17:00',
        isEnabled: false,
      });

      const windows = getAvailabilityForDate(schedule.id, '2026-01-15');
      expect(windows).toEqual([]);
    });

    it('returns empty for day with no rules', () => {
      const schedule = db.collection<any>('availability_schedules').create({
        name: 'Test',
        userId: 'user-1',
        timezone: 'America/New_York',
        isDefault: true,
      });

      // Only set rules for Monday (1), check Sunday (0)
      db.collection<any>('availability_rules').create({
        scheduleId: schedule.id,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        isEnabled: true,
      });

      // 2026-01-18 is a Sunday (dayOfWeek = 0)
      const windows = getAvailabilityForDate(schedule.id, '2026-01-18');
      expect(windows).toEqual([]);
    });

    it('returns multiple windows for same day', () => {
      const schedule = db.collection<any>('availability_schedules').create({
        name: 'Test',
        userId: 'user-1',
        timezone: 'America/New_York',
        isDefault: true,
      });

      // 2026-01-15 is Thursday (dayOfWeek = 4)
      db.collection<any>('availability_rules').create({
        scheduleId: schedule.id,
        dayOfWeek: 4,
        startTime: '09:00',
        endTime: '12:00',
        isEnabled: true,
      });
      db.collection<any>('availability_rules').create({
        scheduleId: schedule.id,
        dayOfWeek: 4,
        startTime: '14:00',
        endTime: '17:00',
        isEnabled: true,
      });

      const windows = getAvailabilityForDate(schedule.id, '2026-01-15');
      expect(windows).toHaveLength(2);
    });
  });
});

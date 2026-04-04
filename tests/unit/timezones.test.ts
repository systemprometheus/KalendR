import { describe, it, expect } from 'vitest';
import {
  TIMEZONES,
  findMatchingTimezone,
  formatTimezoneLabel,
  getTimezone,
} from '@/lib/timezones';

describe('timezones', () => {
  describe('TIMEZONES', () => {
    it('contains a reasonable number of timezones', () => {
      expect(TIMEZONES.length).toBeGreaterThan(50);
    });

    it('every timezone has value, label, and offset', () => {
      for (const tz of TIMEZONES) {
        expect(tz.value).toBeTruthy();
        expect(tz.label).toBeTruthy();
        expect(typeof tz.offset).toBe('string');
      }
    });

    it('includes UTC', () => {
      const utc = TIMEZONES.find(tz => tz.value === 'UTC');
      expect(utc).toBeDefined();
      expect(utc!.label).toBe('UTC');
    });

    it('includes common US timezones', () => {
      const usTimezones = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'];
      for (const tz of usTimezones) {
        expect(TIMEZONES.find(t => t.value === tz)).toBeDefined();
      }
    });

    it('has no duplicate values', () => {
      const values = TIMEZONES.map(tz => tz.value);
      expect(new Set(values).size).toBe(values.length);
    });
  });

  describe('findMatchingTimezone', () => {
    it('returns direct match for known timezone', () => {
      expect(findMatchingTimezone('America/New_York')).toBe('America/New_York');
      expect(findMatchingTimezone('Europe/London')).toBe('Europe/London');
      expect(findMatchingTimezone('Asia/Tokyo')).toBe('Asia/Tokyo');
    });

    it('falls back to region match for obscure aliases', () => {
      // America/Indiana/Indianapolis is not in our list but America/* is
      const result = findMatchingTimezone('America/Indiana/Indianapolis');
      expect(result.startsWith('America/')).toBe(true);
    });

    it('falls back to America/New_York for completely unknown timezone', () => {
      expect(findMatchingTimezone('Unknown/Nowhere')).toBe('America/New_York');
    });

    it('falls back for empty string', () => {
      expect(findMatchingTimezone('')).toBe('America/New_York');
    });
  });

  describe('formatTimezoneLabel', () => {
    it('formats timezone as "Label — Offset"', () => {
      const tz = { value: 'America/New_York', label: 'Eastern Time (US)', offset: 'EST (UTC-5)' };
      expect(formatTimezoneLabel(tz)).toBe('Eastern Time (US) — EST (UTC-5)');
    });
  });

  describe('getTimezone', () => {
    it('returns matching timezone option for known value', () => {
      const tz = getTimezone('America/New_York');
      expect(tz.value).toBe('America/New_York');
      expect(tz.label).toBe('Eastern Time (US)');
    });

    it('returns fallback object for unknown value', () => {
      const tz = getTimezone('Unknown/Zone');
      expect(tz.value).toBe('Unknown/Zone');
      expect(tz.label).toBe('Unknown/Zone');
      expect(tz.offset).toBe('');
    });
  });
});

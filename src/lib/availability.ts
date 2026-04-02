import { availabilitySchedules, availabilityRules, availabilityOverrides, bookings, eventTypes, eventTypeHosts, connectedCalendars, users } from './db';
import { addMinutes, startOfDay, endOfDay, format, parse, isAfter, isBefore, addDays, eachDayOfInterval, setHours, setMinutes } from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { ensureDefaultAvailabilitySchedule } from './default-availability';

export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface AvailableSlot {
  time: string; // ISO string
  endTime: string; // ISO string
}

function zonedDateTimeToUtc(dateStr: string, timeStr: string, timezone: string): Date {
  return fromZonedTime(`${dateStr}T${timeStr}:00`, timezone);
}

function getDateInTimezone(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, 'yyyy-MM-dd');
}

function resolveScheduleForEventType(et: any) {
  if (et.availabilityScheduleId) {
    const assignedSchedule = availabilitySchedules().findById(et.availabilityScheduleId);
    if (assignedSchedule) return assignedSchedule;
  }

  const existingSchedule = availabilitySchedules().findFirst({ where: { userId: et.userId, isDefault: true } })
    || availabilitySchedules().findFirst({ where: { userId: et.userId } });

  if (existingSchedule) return existingSchedule;

  const user = users().findById(et.userId);
  return ensureDefaultAvailabilitySchedule(et.userId, user?.timezone || 'America/New_York');
}

export function getAvailabilityForDate(
  scheduleId: string,
  dateStr: string, // YYYY-MM-DD
): { startTime: string; endTime: string }[] {
  // Check overrides first
  const override = availabilityOverrides().findFirst({
    where: { scheduleId, date: dateStr },
  });

  if (override) {
    if (override.isUnavailable || !override.startTime || !override.endTime) {
      return [];
    }
    return [{ startTime: override.startTime, endTime: override.endTime }];
  }

  // Get day of week
  const date = new Date(dateStr + 'T12:00:00Z');
  const dayOfWeek = date.getUTCDay();

  // Get rules for this day
  const rules = availabilityRules().findMany({
    where: { scheduleId, dayOfWeek, isEnabled: true },
  });

  return rules.map(r => ({ startTime: r.startTime, endTime: r.endTime }));
}

export function generateTimeSlots(
  eventTypeId: string,
  dateStr: string, // YYYY-MM-DD
  inviteeTimezone: string,
): AvailableSlot[] {
  const et = eventTypes().findById(eventTypeId);
  if (!et || !et.isActive) return [];

  const schedule = resolveScheduleForEventType(et);

  if (!schedule) return [];

  const hostTimezone = schedule.timezone || 'America/New_York';
  const duration = et.duration;
  const interval = et.slotInterval || duration;
  const bufferBefore = et.bufferBefore || 0;
  const bufferAfter = et.bufferAfter || 0;
  const minNotice = et.minNotice || 0;

  // Get availability windows for this date
  const windows = getAvailabilityForDate(schedule.id, dateStr);
  if (windows.length === 0) return [];

  // Get existing bookings for the host on this date
  const dayStart = zonedDateTimeToUtc(dateStr, '00:00', hostTimezone).toISOString();
  const dayEnd = zonedDateTimeToUtc(dateStr, '23:59', hostTimezone).toISOString();

  const existingBookings = bookings().findMany({
    where: { hostId: et.userId, status: 'confirmed' },
  }).filter(b => {
    const bookingDate = getDateInTimezone(new Date(b.startTime), hostTimezone);
    return bookingDate === dateStr;
  });

  // Check daily limit
  if (et.dailyLimit) {
    const todayBookings = bookings().findMany({
      where: { eventTypeId, status: 'confirmed' },
    }).filter(b => getDateInTimezone(new Date(b.startTime), hostTimezone) === dateStr);
    if (todayBookings.length >= et.dailyLimit) return [];
  }

  const now = new Date();
  const minBookingTime = addMinutes(now, minNotice);

  const slots: AvailableSlot[] = [];

  for (const window of windows) {
    // Convert the host's local working hours into absolute UTC instants.
    let slotStart = zonedDateTimeToUtc(dateStr, window.startTime, hostTimezone);
    const windowEnd = zonedDateTimeToUtc(dateStr, window.endTime, hostTimezone);

    while (slotStart < windowEnd) {
      const slotEnd = addMinutes(slotStart, duration);

      if (slotEnd > windowEnd) break;

      // Check minimum notice
      if (slotStart < minBookingTime) {
        slotStart = addMinutes(slotStart, interval);
        continue;
      }

      // Check max future days
      if (et.maxFutureDays) {
        const maxDate = addDays(now, et.maxFutureDays);
        if (slotStart > maxDate) break;
      }

      // Check conflicts with existing bookings (including buffers)
      const slotWithBufferStart = addMinutes(slotStart, -bufferBefore);
      const slotWithBufferEnd = addMinutes(slotEnd, bufferAfter);

      const hasConflict = existingBookings.some(booking => {
        const bStart = new Date(booking.startTime);
        const bEnd = new Date(booking.endTime);
        return slotWithBufferStart < bEnd && slotWithBufferEnd > bStart;
      });

      if (!hasConflict) {
        slots.push({
          time: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
        });
      }

      slotStart = addMinutes(slotStart, interval);
    }
  }

  return slots;
}

export function getAvailableDates(
  eventTypeId: string,
  month: number, // 0-indexed
  year: number,
  timezone: string,
): string[] {
  const et = eventTypes().findById(eventTypeId);
  if (!et) return [];

  const schedule = resolveScheduleForEventType(et);

  if (!schedule) return [];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const availableDates: string[] = [];
  const now = new Date();
  const minNotice = et.minNotice || 0;
  const maxFutureDays = et.maxFutureDays || 60;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const date = new Date(dateStr + 'T12:00:00Z');

    // Skip past dates
    if (date < startOfDay(now)) continue;

    // Skip dates beyond max future
    if (date > addDays(now, maxFutureDays)) continue;

    // Check if there's any availability on this day
    const windows = getAvailabilityForDate(schedule.id, dateStr);
    if (windows.length > 0) {
      availableDates.push(dateStr);
    }
  }

  return availableDates;
}

// Round-robin host selection
export function selectRoundRobinHost(eventTypeId: string): string | null {
  const et = eventTypes().findById(eventTypeId);
  if (!et) return null;

  const hosts = eventTypeHosts().findMany({
    where: { eventTypeId },
  });

  if (hosts.length === 0) return et.userId;

  const rrHosts = hosts.filter(h => !h.isRequired);
  if (rrHosts.length === 0) return hosts[0]?.userId || et.userId;

  if (et.roundRobinMode === 'equal_distribution') {
    // Find host with fewest recent bookings
    const hostBookingCounts = rrHosts.map(h => ({
      userId: h.userId,
      priority: h.priority || 0,
      count: bookings().count({ hostId: h.userId, eventTypeId, status: 'confirmed' }),
    }));

    hostBookingCounts.sort((a, b) => {
      if (a.count !== b.count) return a.count - b.count;
      return b.priority - a.priority;
    });

    return hostBookingCounts[0]?.userId || et.userId;
  }

  // Default: optimize for availability (pick first available by priority)
  const sorted = [...rrHosts].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  return sorted[0]?.userId || et.userId;
}

// Check if all required hosts are available (collective events)
export function checkCollectiveAvailability(
  eventTypeId: string,
  startTime: Date,
  endTime: Date,
): boolean {
  const hosts = eventTypeHosts().findMany({
    where: { eventTypeId, isRequired: true },
  });

  for (const host of hosts) {
    const conflicts = bookings().findMany({
      where: { hostId: host.userId, status: 'confirmed' },
    }).filter(b => {
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      return startTime < bEnd && endTime > bStart;
    });

    if (conflicts.length > 0) return false;
  }

  return true;
}

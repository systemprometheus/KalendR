import { availabilitySchedules, availabilityRules, availabilityOverrides, bookings, eventTypes, eventTypeHosts } from './db';
import { addMinutes, startOfDay, endOfDay, format, parse, isAfter, isBefore, addDays, eachDayOfInterval, setHours, setMinutes } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { getGoogleCalendarBusyIntervals, hasBusyIntervalConflict, hasGoogleCalendarConflict, type BusyInterval } from './google-calendar';

export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface AvailableSlot {
  time: string; // ISO string
  endTime: string; // ISO string
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

export async function generateTimeSlots(
  eventTypeId: string,
  dateStr: string, // YYYY-MM-DD
  inviteeTimezone: string,
  preloadedBusyIntervals?: BusyInterval[],
): Promise<AvailableSlot[]> {
  const et = eventTypes().findById(eventTypeId);
  if (!et || !et.isActive) return [];

  const schedule = et.availabilityScheduleId
    ? availabilitySchedules().findById(et.availabilityScheduleId)
    : availabilitySchedules().findFirst({ where: { userId: et.userId, isDefault: true } });

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
  const dayStart = dateStr + 'T00:00:00.000Z';
  const dayEnd = dateStr + 'T23:59:59.999Z';

  const existingBookings = bookings().findMany({
    where: { hostId: et.userId, status: 'confirmed' },
  }).filter(b => {
    const bookingDate = b.startTime.substring(0, 10);
    return bookingDate === dateStr;
  });

  const googleBusyIntervals = et.userId
    ? (preloadedBusyIntervals || await getGoogleCalendarBusyIntervals(
      et.userId,
      dayStart,
      dayEnd,
    ))
    : [];

  // Check daily limit
  if (et.dailyLimit) {
    const todayBookings = bookings().findMany({
      where: { eventTypeId, status: 'confirmed' },
    }).filter(b => b.startTime.substring(0, 10) === dateStr);
    if (todayBookings.length >= et.dailyLimit) return [];
  }

  const now = new Date();
  const minBookingTime = addMinutes(now, minNotice);

  const slots: AvailableSlot[] = [];

  for (const window of windows) {
    // Parse window times in host timezone
    const [startH, startM] = window.startTime.split(':').map(Number);
    const [endH, endM] = window.endTime.split(':').map(Number);

    // Create date objects in host timezone
    let slotStart = new Date(`${dateStr}T${window.startTime}:00`);
    const windowEnd = new Date(`${dateStr}T${window.endTime}:00`);

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
      }) || hasBusyIntervalConflict(googleBusyIntervals, slotWithBufferStart, slotWithBufferEnd);

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

export async function getAvailableDates(
  eventTypeId: string,
  month: number, // 0-indexed
  year: number,
  timezone: string,
): Promise<string[]> {
  const et = eventTypes().findById(eventTypeId);
  if (!et) return [];

  const schedule = et.availabilityScheduleId
    ? availabilitySchedules().findById(et.availabilityScheduleId)
    : availabilitySchedules().findFirst({ where: { userId: et.userId, isDefault: true } });

  if (!schedule) return [];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const availableDates: string[] = [];
  const now = new Date();
  const maxFutureDays = et.maxFutureDays || 60;
  const monthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)).toISOString();
  const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)).toISOString();
  const monthlyBusyIntervals = et.userId
    ? await getGoogleCalendarBusyIntervals(et.userId, monthStart, monthEnd)
    : [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const date = new Date(dateStr + 'T12:00:00Z');

    // Skip past dates
    if (date < startOfDay(now)) continue;

    // Skip dates beyond max future
    if (date > addDays(now, maxFutureDays)) continue;

    // Check if there's any availability on this day
    const windows = getAvailabilityForDate(schedule.id, dateStr);
    if (windows.length > 0 && (await generateTimeSlots(et.id, dateStr, timezone, monthlyBusyIntervals)).length > 0) {
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
export async function checkCollectiveAvailability(
  eventTypeId: string,
  startTime: Date,
  endTime: Date,
): Promise<boolean> {
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
    if (await hasGoogleCalendarConflict(host.userId, startTime, endTime)) return false;
  }

  return true;
}

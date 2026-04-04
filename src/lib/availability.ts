import { availabilitySchedules, availabilityRules, availabilityOverrides, bookings, eventTypes, eventTypeHosts, users } from './db';
import { addDays, addMilliseconds, addMinutes, format, startOfDay, startOfWeek } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { getGoogleCalendarBusyIntervals, hasBusyIntervalConflict, hasGoogleCalendarConflict, type BusyInterval } from './google-calendar';
import { ensureDefaultAvailabilitySchedule } from './default-availability';

export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface AvailableSlot {
  time: string; // ISO string
  endTime: string; // ISO string
}

function resolveScheduleForEventType(et: any, scheduleOwnerId = et.userId) {
  const schedules = availabilitySchedules().findMany({
    where: { userId: scheduleOwnerId },
    orderBy: { updatedAt: 'desc' },
  });

  const schedulesWithRules = schedules.map(schedule => ({
    schedule,
    enabledRuleCount: availabilityRules().count({
      scheduleId: schedule.id,
      isEnabled: true,
    }),
  }));

  const assignedSchedule = et.availabilityScheduleId
    ? schedulesWithRules.find(({ schedule }) => schedule.id === et.availabilityScheduleId)
    : null;

  const preferredSchedule = schedulesWithRules.find(({ schedule, enabledRuleCount }) => schedule.isDefault && enabledRuleCount > 0)
    || (assignedSchedule && assignedSchedule.enabledRuleCount > 0 ? assignedSchedule : null)
    || schedulesWithRules.find(({ enabledRuleCount }) => enabledRuleCount > 0)
    || null;

  if (preferredSchedule) return preferredSchedule.schedule;
  if (assignedSchedule) return assignedSchedule.schedule;
  if (schedules[0]) return schedules[0];

  const user = users().findById(scheduleOwnerId);
  return ensureDefaultAvailabilitySchedule(scheduleOwnerId, user?.timezone || 'America/New_York');
}

function getInviteeDayRange(dateStr: string, timezone: string) {
  const start = fromZonedTime(`${dateStr}T00:00:00`, timezone);
  const end = addDays(start, 1);
  return { start, end };
}

function getHostDateCandidates(dateStr: string, inviteeTimezone: string, hostTimezone: string) {
  const { start, end } = getInviteeDayRange(dateStr, inviteeTimezone);
  return [...new Set([
    formatInTimeZone(start, hostTimezone, 'yyyy-MM-dd'),
    formatInTimeZone(addMilliseconds(end, -1), hostTimezone, 'yyyy-MM-dd'),
  ])];
}

function getBookingBuffers(booking: any) {
  const eventType = eventTypes().findById(booking.eventTypeId);
  return {
    before: eventType?.bufferBefore || 0,
    after: eventType?.bufferAfter || 0,
  };
}

function getHostDayKey(date: Date, timezone: string) {
  return formatInTimeZone(date, timezone, 'yyyy-MM-dd');
}

function getHostWeekKey(date: Date, timezone: string) {
  const zonedDate = new Date(formatInTimeZone(date, timezone, "yyyy-MM-dd'T'HH:mm:ss"));
  return format(startOfWeek(zonedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
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
  hostIdOverride?: string,
): Promise<AvailableSlot[]> {
  const et = eventTypes().findById(eventTypeId);
  if (!et || !et.isActive) return [];

  const hostId = hostIdOverride || et.userId;
  const schedule = resolveScheduleForEventType(et, hostId);

  if (!schedule) return [];

  const hostTimezone = schedule.timezone || 'America/New_York';
  const duration = et.duration;
  const interval = et.slotInterval || duration;
  const bufferBefore = et.bufferBefore || 0;
  const bufferAfter = et.bufferAfter || 0;
  const minNotice = et.minNotice || 0;
  const { start: inviteeDayStart, end: inviteeDayEnd } = getInviteeDayRange(dateStr, inviteeTimezone);
  const hostDateCandidates = getHostDateCandidates(dateStr, inviteeTimezone, hostTimezone);

  const dayStart = addDays(inviteeDayStart, -1).toISOString();
  const dayEnd = addDays(inviteeDayEnd, 1).toISOString();

  const existingBookings = bookings().findMany({
    where: { hostId, status: 'confirmed' },
  }).filter((b: any) => {
    const bookingStart = new Date(b.startTime);
    const bookingEnd = new Date(b.endTime);
    return bookingStart < new Date(dayEnd) && bookingEnd > new Date(dayStart);
  });

  const googleBusyIntervals = hostId
    ? (preloadedBusyIntervals || await getGoogleCalendarBusyIntervals(
      hostId,
      dayStart,
      dayEnd,
    ))
    : [];
  const eventBookings = bookings().findMany({
    where: { eventTypeId, status: 'confirmed' },
  });
  const dailyCounts = new Map<string, number>();
  const weeklyCounts = new Map<string, number>();

  for (const booking of eventBookings) {
    const bookingStart = new Date(booking.startTime);
    const dayKey = getHostDayKey(bookingStart, hostTimezone);
    dailyCounts.set(dayKey, (dailyCounts.get(dayKey) || 0) + 1);
    const weekKey = getHostWeekKey(bookingStart, hostTimezone);
    weeklyCounts.set(weekKey, (weeklyCounts.get(weekKey) || 0) + 1);
  }

  const now = new Date();
  const minBookingTime = addMinutes(now, minNotice);

  const slots: AvailableSlot[] = [];

  for (const hostDate of hostDateCandidates) {
    const windows = getAvailabilityForDate(schedule.id, hostDate);
    for (const window of windows) {
      let slotStart = fromZonedTime(`${hostDate}T${window.startTime}:00`, hostTimezone);
      const windowEnd = fromZonedTime(`${hostDate}T${window.endTime}:00`, hostTimezone);

      while (slotStart < windowEnd) {
        const slotEnd = addMinutes(slotStart, duration);

        if (slotEnd > windowEnd) break;
        if (slotStart < inviteeDayStart || slotStart >= inviteeDayEnd) {
          slotStart = addMinutes(slotStart, interval);
          continue;
        }

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

        const hostDayKey = getHostDayKey(slotStart, hostTimezone);
        if (et.dailyLimit && (dailyCounts.get(hostDayKey) || 0) >= et.dailyLimit) {
          slotStart = addMinutes(slotStart, interval);
          continue;
        }

        const hostWeekKey = getHostWeekKey(slotStart, hostTimezone);
        if (et.weeklyLimit && (weeklyCounts.get(hostWeekKey) || 0) >= et.weeklyLimit) {
          slotStart = addMinutes(slotStart, interval);
          continue;
        }

        // Check conflicts with existing bookings (including buffers on both sides)
        const slotWithBufferStart = addMinutes(slotStart, -bufferBefore);
        const slotWithBufferEnd = addMinutes(slotEnd, bufferAfter);

        const hasConflict = existingBookings.some((booking: any) => {
          const buffers = getBookingBuffers(booking);
          const bStart = addMinutes(new Date(booking.startTime), -buffers.before);
          const bEnd = addMinutes(new Date(booking.endTime), buffers.after);
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

  const schedule = resolveScheduleForEventType(et);

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
    const { start: inviteeDayStart } = getInviteeDayRange(dateStr, timezone);

    // Skip past dates
    if (inviteeDayStart < startOfDay(now)) continue;

    // Skip dates beyond max future
    if (inviteeDayStart > addDays(now, maxFutureDays)) continue;

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

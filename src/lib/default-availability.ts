import { availabilitySchedules, availabilityRules } from './db';

export function ensureDefaultAvailabilitySchedule(userId: string, timezone = 'America/New_York') {
  const existingDefault = availabilitySchedules().findFirst({
    where: { userId, isDefault: true },
  });

  if (existingDefault) return existingDefault;

  const existingSchedules = availabilitySchedules().findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (existingSchedules.length > 0) {
    const promoted = availabilitySchedules().update(existingSchedules[0].id, { isDefault: true });
    return promoted || { ...existingSchedules[0], isDefault: true };
  }

  const schedule = availabilitySchedules().create({
    name: 'Working Hours',
    userId,
    timezone,
    isDefault: true,
  });

  for (let day = 1; day <= 5; day++) {
    availabilityRules().create({
      scheduleId: schedule.id,
      dayOfWeek: day,
      startTime: '09:00',
      endTime: '17:00',
      isEnabled: true,
    });
  }

  return schedule;
}

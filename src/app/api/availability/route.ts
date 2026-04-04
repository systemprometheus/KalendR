import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { availabilitySchedules, availabilityRules } from '@/lib/db';
import { ensureDefaultAvailabilitySchedule } from '@/lib/default-availability';

export async function GET(_req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    ensureDefaultAvailabilitySchedule(user.id, user.timezone || 'America/New_York');

    const schedules = availabilitySchedules().findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    // Attach rules to each schedule
    const schedulesWithRules = schedules.map(s => ({
      ...s,
      rules: availabilityRules().findMany({ where: { scheduleId: s.id } })
        .sort((a: any, b: any) => a.dayOfWeek - b.dayOfWeek),
    }));

    return NextResponse.json({ schedules: schedulesWithRules });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, timezone, rules } = await req.json();
    const hasSchedules = availabilitySchedules().count({ userId: user.id }) > 0;

    const schedule = availabilitySchedules().create({
      name: name || 'New Schedule',
      userId: user.id,
      timezone: timezone || user.timezone,
      isDefault: !hasSchedules,
    });

    // Create rules
    if (rules && Array.isArray(rules)) {
      for (const rule of rules) {
        availabilityRules().create({
          scheduleId: schedule.id,
          dayOfWeek: rule.dayOfWeek,
          startTime: rule.startTime,
          endTime: rule.endTime,
          isEnabled: rule.isEnabled ?? true,
        });
      }
    } else {
      // Default Mon-Fri 9-5
      for (let day = 1; day <= 5; day++) {
        availabilityRules().create({
          scheduleId: schedule.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '17:00',
          isEnabled: true,
        });
      }
    }

    const rulesData = availabilityRules().findMany({ where: { scheduleId: schedule.id } });
    return NextResponse.json({ schedule: { ...schedule, rules: rulesData } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

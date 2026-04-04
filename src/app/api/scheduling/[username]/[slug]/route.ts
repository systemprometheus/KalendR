import { NextRequest, NextResponse } from 'next/server';
import { users, eventTypes, availabilitySchedules, availabilityRules } from '@/lib/db';
import { generateTimeSlots, getAvailableDates } from '@/lib/availability';
import { normalizeTimezone } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string; slug: string }> }) {
  try {
    const { username, slug } = await params;
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // 0-indexed
    const year = searchParams.get('year');
    const date = searchParams.get('date'); // YYYY-MM-DD for time slots
    // Find user by slug
    const user = users().findFirst({ where: { slug: username } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const timezone = normalizeTimezone(searchParams.get('timezone'), user.timezone || 'America/New_York');

    // Find event type
    const foundEventType = eventTypes().findFirst({ where: { userId: user.id, slug, isActive: true, isArchived: false } });
    if (!foundEventType) {
      return NextResponse.json({ error: 'Event type not found' }, { status: 404 });
    }

    // Availability is configured globally today. Public booking pages should use the user's
    // active schedule with real enabled hours instead of a stale event-level schedule link.
    const schedules = availabilitySchedules().findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    });

    const schedulesWithRules = schedules.map(schedule => ({
      schedule,
      enabledRuleCount: availabilityRules().count({
        scheduleId: schedule.id,
        isEnabled: true,
      }),
    }));

    const assignedSchedule = foundEventType.availabilityScheduleId
      ? schedulesWithRules.find(({ schedule }) => schedule.id === foundEventType.availabilityScheduleId)
      : null;

    const preferredSchedule = schedulesWithRules.find(({ schedule, enabledRuleCount }) => schedule.isDefault && enabledRuleCount > 0)
      || (assignedSchedule && assignedSchedule.enabledRuleCount > 0 ? assignedSchedule : null)
      || schedulesWithRules.find(({ enabledRuleCount }) => enabledRuleCount > 0)
      || null;

    const et = preferredSchedule && foundEventType.availabilityScheduleId !== preferredSchedule.schedule.id
      ? eventTypes().update(foundEventType.id, { availabilityScheduleId: preferredSchedule.schedule.id }) || foundEventType
      : foundEventType;

    // Get custom questions
    let customQuestions = [];
    try {
      customQuestions = et.customQuestions ? JSON.parse(et.customQuestions) : [];
    } catch {}

    // Base response
    const response: any = {
      eventType: {
        id: et.id,
        title: et.title,
        description: et.description,
        duration: et.duration,
        color: et.color,
        locationType: et.locationType,
        customQuestions,
        durationOptions: et.durationOptions ? JSON.parse(et.durationOptions) : null,
        confirmationMessage: et.confirmationMessage,
      },
      host: {
        name: user.name,
        avatarUrl: user.avatarUrl,
        welcomeMessage: user.welcomeMessage,
        timezone: user.timezone,
      },
    };

    // If requesting available dates for a month
    if (month !== null && year) {
      const parsedMonth = Number.parseInt(month, 10);
      const parsedYear = Number.parseInt(year, 10);
      if (!Number.isInteger(parsedMonth) || parsedMonth < 0 || parsedMonth > 11 || !Number.isInteger(parsedYear) || parsedYear < 2020 || parsedYear > 2100) {
        return NextResponse.json({ error: 'Invalid month or year' }, { status: 400 });
      }
      response.availableDates = await getAvailableDates(
        et.id,
        parsedMonth,
        parsedYear,
        timezone,
      );
    }

    // If requesting time slots for a specific date
    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
      }
      response.timeSlots = await generateTimeSlots(et.id, date, timezone);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Scheduling API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

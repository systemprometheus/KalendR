import { NextRequest, NextResponse } from 'next/server';
import { users, eventTypes, availabilitySchedules } from '@/lib/db';
import { generateTimeSlots, getAvailableDates } from '@/lib/availability';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string; slug: string }> }) {
  try {
    const { username, slug } = await params;
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // 0-indexed
    const year = searchParams.get('year');
    const date = searchParams.get('date'); // YYYY-MM-DD for time slots
    const timezone = searchParams.get('timezone') || 'America/New_York';

    // Find user by slug
    const user = users().findFirst({ where: { slug: username } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find event type
    const et = eventTypes().findFirst({ where: { userId: user.id, slug, isActive: true, isArchived: false } });
    if (!et) {
      return NextResponse.json({ error: 'Event type not found' }, { status: 404 });
    }

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
      response.availableDates = getAvailableDates(
        et.id,
        parseInt(month),
        parseInt(year),
        timezone,
      );
    }

    // If requesting time slots for a specific date
    if (date) {
      response.timeSlots = await generateTimeSlots(et.id, date, timezone);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Scheduling API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

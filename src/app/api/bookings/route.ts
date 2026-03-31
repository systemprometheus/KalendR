import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { bookings, eventTypes, users } from '@/lib/db';
import { generateTimeSlots, selectRoundRobinHost, checkCollectiveAvailability } from '@/lib/availability';
import { sendEmail, bookingConfirmationEmail, hostNotificationEmail } from '@/lib/email';
import { addMinutes, format } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const period = searchParams.get('period'); // upcoming, past

    let where: any = { hostId: user.id };
    if (status) where.status = status;

    let items = bookings().findMany({ where, orderBy: { startTime: 'asc' } });

    const now = new Date().toISOString();
    if (period === 'upcoming') {
      items = items.filter((b: any) => b.startTime >= now && b.status === 'confirmed');
    } else if (period === 'past') {
      items = items.filter((b: any) => b.startTime < now || b.status !== 'confirmed');
    }

    // Enrich with event type info
    const enriched = items.map((b: any) => {
      const et = eventTypes().findById(b.eventTypeId);
      return { ...b, eventType: et ? { title: et.title, color: et.color, duration: et.duration } : null };
    });

    return NextResponse.json({ bookings: enriched });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventTypeId, startTime, timezone, inviteeName, inviteeEmail, inviteePhone,
            inviteeCompany, inviteeJobTitle, inviteeNotes, customResponses, source } = body;

    if (!eventTypeId || !startTime || !inviteeName || !inviteeEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const et = eventTypes().findById(eventTypeId);
    if (!et || !et.isActive) {
      return NextResponse.json({ error: 'Event type not found or inactive' }, { status: 404 });
    }

    const start = new Date(startTime);
    const end = addMinutes(start, et.duration);

    // Determine host
    let hostId = et.userId;

    if (et.eventTypeKind === 'round_robin') {
      hostId = selectRoundRobinHost(et.id) || et.userId;
    }

    if (et.eventTypeKind === 'collective') {
      const available = checkCollectiveAvailability(et.id, start, end);
      if (!available) {
        return NextResponse.json({ error: 'Not all required hosts are available at this time' }, { status: 409 });
      }
    }

    // Check for double booking
    const existingBookings = bookings().findMany({
      where: { hostId, status: 'confirmed' },
    }).filter((b: any) => {
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      return start < bEnd && end > bStart;
    });

    if (existingBookings.length > 0) {
      return NextResponse.json({ error: 'This time slot is no longer available' }, { status: 409 });
    }

    // Check daily limit
    if (et.dailyLimit) {
      const dateStr = start.toISOString().substring(0, 10);
      const dayBookings = bookings().findMany({
        where: { eventTypeId, status: 'confirmed' },
      }).filter((b: any) => b.startTime.substring(0, 10) === dateStr);

      if (dayBookings.length >= et.dailyLimit) {
        return NextResponse.json({ error: 'Daily booking limit reached' }, { status: 409 });
      }
    }

    // Determine location
    let locationType = et.locationType;
    let locationValue = et.locationValue;
    let meetingUrl = null;

    if (locationType === 'google_meet') {
      // TODO: Create real Google Meet link via Calendar API when Google integration is connected
      locationValue = 'Google Meet link will be provided in calendar invite';
    } else if (locationType === 'zoom') {
      // TODO: Create real Zoom meeting via Zoom API when Zoom integration is connected
      locationValue = 'Zoom link will be provided in calendar invite';
    }

    const booking = bookings().create({
      uid: Math.random().toString(36).substring(2) + Date.now().toString(36),
      eventTypeId,
      hostId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      timezone: timezone || 'America/New_York',
      status: et.requiresConfirmation ? 'pending' : 'confirmed',
      inviteeName,
      inviteeEmail,
      inviteePhone: inviteePhone || null,
      inviteeCompany: inviteeCompany || null,
      inviteeJobTitle: inviteeJobTitle || null,
      inviteeNotes: inviteeNotes || null,
      customResponses: customResponses ? JSON.stringify(customResponses) : null,
      locationType,
      locationValue,
      meetingUrl,
      source: source || 'booking_page',
      cancelToken: Math.random().toString(36).substring(2) + Date.now().toString(36),
      rescheduleToken: Math.random().toString(36).substring(2) + Date.now().toString(36),
    });

    // Send emails
    const host = users().findById(hostId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const dateTimeStr = format(start, 'EEEE, MMMM d, yyyy h:mm a');

    if (host) {
      // Send confirmation to invitee
      const confirmEmail = bookingConfirmationEmail({
        inviteeName,
        hostName: host.name,
        eventTitle: et.title,
        dateTime: dateTimeStr,
        timezone: timezone || 'America/New_York',
        duration: et.duration,
        location: locationValue || locationType,
        cancelUrl: `${appUrl}/booking/${booking.uid}/cancel?token=${booking.cancelToken}`,
        rescheduleUrl: `${appUrl}/booking/${booking.uid}/reschedule?token=${booking.rescheduleToken}`,
      });
      confirmEmail.to = inviteeEmail;
      sendEmail(confirmEmail);

      // Send notification to host
      const hostEmail = hostNotificationEmail({
        hostName: host.name,
        inviteeName,
        inviteeEmail,
        eventTitle: et.title,
        dateTime: dateTimeStr,
        timezone: timezone || 'America/New_York',
        duration: et.duration,
        location: locationValue || locationType,
      });
      hostEmail.to = host.email;
      sendEmail(hostEmail);
    }

    return NextResponse.json({
      booking: {
        id: booking.id,
        uid: booking.uid,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        cancelToken: booking.cancelToken,
        rescheduleToken: booking.rescheduleToken,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Booking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

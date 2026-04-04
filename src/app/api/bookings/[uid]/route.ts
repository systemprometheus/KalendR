import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthContext, requireAuthWithScopes } from '@/lib/auth';
import { bookings, eventTypes, users } from '@/lib/db';
import { sendEmail, cancellationEmail } from '@/lib/email';
import { deleteGoogleCalendarEventForBooking, ensureGoogleCalendarWatches } from '@/lib/google-calendar';
import { format } from 'date-fns';
import { isValidDateTime, sanitizeText } from '@/lib/validation';

function parseBookingMetadata(metadata?: string | null) {
  if (!metadata) return null;

  try {
    return JSON.parse(metadata);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await params;
    const booking = bookings().findFirst({ where: { uid } });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const et = eventTypes().findById(booking.eventTypeId);
    const host = users().findById(booking.hostId);

    return NextResponse.json({
      booking: {
        id: booking.id,
        uid: booking.uid,
        startTime: booking.startTime,
        endTime: booking.endTime,
        timezone: booking.timezone,
        status: booking.status,
        inviteeName: booking.inviteeName,
        inviteeEmail: booking.inviteeEmail,
        inviteePhone: booking.inviteePhone || null,
        inviteeCompany: booking.inviteeCompany || null,
        inviteeJobTitle: booking.inviteeJobTitle || null,
        inviteeNotes: booking.inviteeNotes || null,
        locationType: booking.locationType,
        locationValue: booking.locationValue,
        meetingUrl: booking.meetingUrl || null,
        source: booking.source || null,
        createdAt: booking.createdAt,
        eventType: et ? { title: et.title, description: et.description, color: et.color, duration: et.duration, confirmationMessage: et.confirmationMessage } : null,
        host: host ? { name: host.name, email: host.email, avatarUrl: host.avatarUrl, timezone: host.timezone } : null,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const { uid } = await params;
    const body = await req.json();
    const { action, cancelToken, rescheduleToken, reason, newStartTime } = body;

    const booking = bookings().findFirst({ where: { uid } });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (action === 'cancel') {
      // Verify token (either cancelToken from invitee or auth from host)
      const authContext = await getCurrentAuthContext();
      const user = authContext?.user || null;
      const isHost = user && user.id === booking.hostId;
      const hasToken = cancelToken && cancelToken === booking.cancelToken;

      if (isHost) {
        await requireAuthWithScopes(['bookings:write']);
      }

      if (!isHost && !hasToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const bookingMetadata = parseBookingMetadata(booking.metadata);
      if (booking.calendarEventId || bookingMetadata?.googleCalendar?.eventId) {
        await deleteGoogleCalendarEventForBooking({
          userId: booking.hostId,
          eventId: bookingMetadata?.googleCalendar?.eventId || booking.calendarEventId,
          connectedCalendarId: bookingMetadata?.googleCalendar?.connectedCalendarId,
          calendarId: bookingMetadata?.googleCalendar?.calendarId,
        });
      }

      bookings().update(booking.id, {
        status: 'cancelled',
        cancelReason: sanitizeText(reason, 500),
        cancelledAt: new Date().toISOString(),
      });

      await ensureGoogleCalendarWatches(booking.hostId).catch((error) => {
        console.error('Failed to refresh Google Calendar watches after cancellation', error);
      });

      // Send cancellation emails
      const et = eventTypes().findById(booking.eventTypeId);
      const host = users().findById(booking.hostId);
      const dateTimeStr = format(new Date(booking.startTime), 'EEEE, MMMM d, yyyy h:mm a');
      const cancelledBy = isHost ? 'the host' : 'the invitee';

      if (host && et) {
        const toInvitee = cancellationEmail({
          recipientName: booking.inviteeName,
          eventTitle: et.title,
          dateTime: dateTimeStr,
          cancelledBy,
          reason,
        });
        toInvitee.to = booking.inviteeEmail;
        sendEmail(toInvitee);

        const toHost = cancellationEmail({
          recipientName: host.name,
          eventTitle: et.title,
          dateTime: dateTimeStr,
          cancelledBy,
          reason,
        });
        toHost.to = host.email;
        sendEmail(toHost);
      }

      return NextResponse.json({ success: true, status: 'cancelled' });
    }

    if (action === 'reschedule') {
      const authContext = await getCurrentAuthContext();
      const user = authContext?.user || null;
      const isHost = user && user.id === booking.hostId;
      const hasToken = rescheduleToken && rescheduleToken === booking.rescheduleToken;

      if (isHost) {
        await requireAuthWithScopes(['bookings:write']);
      }

      if (!isHost && !hasToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      if (!isValidDateTime(newStartTime)) {
        return NextResponse.json({ error: 'New start time is required' }, { status: 400 });
      }

      const bookingMetadata = parseBookingMetadata(booking.metadata);
      if (booking.calendarEventId || bookingMetadata?.googleCalendar?.eventId) {
        await deleteGoogleCalendarEventForBooking({
          userId: booking.hostId,
          eventId: bookingMetadata?.googleCalendar?.eventId || booking.calendarEventId,
          connectedCalendarId: bookingMetadata?.googleCalendar?.connectedCalendarId,
          calendarId: bookingMetadata?.googleCalendar?.calendarId,
        });
      }

      // Mark old booking as rescheduled
      bookings().update(booking.id, {
        status: 'rescheduled',
      });

      await ensureGoogleCalendarWatches(booking.hostId).catch((error) => {
        console.error('Failed to refresh Google Calendar watches after reschedule', error);
      });

      // Return info to create new booking
      return NextResponse.json({
        success: true,
        status: 'rescheduled',
        originalBookingId: booking.id,
        eventTypeId: booking.eventTypeId,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden:')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

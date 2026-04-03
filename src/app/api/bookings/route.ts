import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireAuthWithScopes } from '@/lib/auth';
import { bookings, eventTypes, users } from '@/lib/db';
import { generateTimeSlots, selectRoundRobinHost, checkCollectiveAvailability } from '@/lib/availability';
import { sendEmail, bookingConfirmationEmail, hostNotificationEmail } from '@/lib/email';
import {
  createGoogleCalendarEventForBooking,
  ensureGoogleCalendarWatches,
  hasGoogleCalendarConflict,
} from '@/lib/google-calendar';
import { addMinutes, format } from 'date-fns';

function parseBookingMetadata(metadata?: string | null) {
  if (!metadata) return {};

  try {
    return JSON.parse(metadata);
  } catch {
    return {};
  }
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function toIcsDateTime(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function foldIcsLine(line: string) {
  const segments: string[] = [];
  let remaining = line;
  let isFirstLine = true;

  while (Buffer.byteLength(remaining, 'utf-8') > (isFirstLine ? 75 : 74)) {
    const maxBytes = isFirstLine ? 75 : 74;
    let splitIndex = remaining.length;

    while (splitIndex > 1 && Buffer.byteLength(remaining.slice(0, splitIndex), 'utf-8') > maxBytes) {
      splitIndex -= 1;
    }

    const chunk = remaining.slice(0, splitIndex);
    segments.push(isFirstLine ? chunk : ` ${chunk}`);
    remaining = remaining.slice(splitIndex);
    isFirstLine = false;
  }

  if (remaining) {
    segments.push(isFirstLine ? remaining : ` ${remaining}`);
  }

  return segments.join('\r\n');
}

function buildBookingIcsInvite(params: {
  bookingUid: string;
  eventTitle: string;
  startTime: string;
  endTime: string;
  hostName: string;
  hostEmail: string;
  inviteeName: string;
  inviteeEmail: string;
  description: string;
  location: string;
  meetingUrl?: string | null;
  calendarInviteUrl?: string | null;
  appUrl: string;
}) {
  const {
    bookingUid,
    eventTitle,
    startTime,
    endTime,
    hostName,
    hostEmail,
    inviteeName,
    inviteeEmail,
    description,
    location,
    meetingUrl,
    calendarInviteUrl,
    appUrl,
  } = params;

  const descriptionLines = [description];
  if (meetingUrl) {
    descriptionLines.push('', `Join meeting: ${meetingUrl}`);
  } else if (calendarInviteUrl) {
    descriptionLines.push('', `Open in Google Calendar: ${calendarInviteUrl}`);
  }
  descriptionLines.push('', `Manage booking: ${appUrl}/booking/${bookingUid}`);
  const enrichedDescription = descriptionLines.join('\n');
  const now = new Date();

  const lines = [
    'BEGIN:VCALENDAR',
    'PRODID:-//KalendR//Booking//EN',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(`${bookingUid}@kalendrio`)}`,
    `DTSTAMP:${toIcsDateTime(now)}`,
    `CREATED:${toIcsDateTime(now)}`,
    `LAST-MODIFIED:${toIcsDateTime(now)}`,
    `DTSTART:${toIcsDateTime(startTime)}`,
    `DTEND:${toIcsDateTime(endTime)}`,
    `SUMMARY:${escapeIcsText(eventTitle)}`,
    `DESCRIPTION:${escapeIcsText(enrichedDescription)}`,
    `ORGANIZER;CN=${escapeIcsText(hostName)}:MAILTO:${hostEmail}`,
    `ATTENDEE;CN=${escapeIcsText(inviteeName)};CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:MAILTO:${inviteeEmail}`,
    `ATTENDEE;CN=${escapeIcsText(hostName)};CUTYPE=INDIVIDUAL;ROLE=CHAIR;PARTSTAT=ACCEPTED:MAILTO:${hostEmail}`,
    `LOCATION:${escapeIcsText(location)}`,
    `URL:${escapeIcsText(meetingUrl || `${appUrl}/booking/${bookingUid}`)}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.map(foldIcsLine).join('\r\n');
}

function normalizeHttpUrl(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireAuthWithScopes(['bookings:read']);

    await ensureGoogleCalendarWatches(user.id).catch((error) => {
      console.error('Failed to ensure Google Calendar watches', error);
    });

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
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden:')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
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
      const available = await checkCollectiveAvailability(et.id, start, end);
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

    if (await hasGoogleCalendarConflict(hostId, start, end)) {
      return NextResponse.json({ error: 'This time slot conflicts with the host calendar' }, { status: 409 });
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

    const looksLikeGoogleMeetPlaceholder = (value: string | null | undefined) => {
      if (!value) return false;
      const normalized = value.toLowerCase();
      return normalized.includes('google meet');
    };

    // Determine location
    const bookingStatus = et.requiresConfirmation ? 'pending' : 'confirmed';
    let locationType = et.locationType;
    let locationValue = et.locationValue;
    let meetingUrl = null;

    // Handle legacy/custom event types that stored "Google Meet" as free text.
    if (locationType === 'google_meet' || looksLikeGoogleMeetPlaceholder(locationValue)) {
      locationType = 'google_meet';
      locationValue = 'Google Meet';
    } else if (locationType === 'zoom') {
      // TODO: Create real Zoom meeting via Zoom API when Zoom integration is connected
      locationValue = 'Zoom link will be provided in calendar invite';
    }

    const booking = bookings().create({
      uid: randomUUID(),
      eventTypeId,
      hostId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      timezone: timezone || 'America/New_York',
      status: bookingStatus,
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
      cancelToken: randomUUID(),
      rescheduleToken: randomUUID(),
    });

    const host = users().findById(hostId);
    let bookingRecord = booking;

    if (host && booking.status === 'confirmed') {
      const googleEvent = await createGoogleCalendarEventForBooking({
        booking: booking as any,
        eventType: et as any,
        host: host as any,
      });

      if (googleEvent) {
        bookingRecord = bookings().update(booking.id, {
          calendarEventId: googleEvent.eventId,
          meetingUrl: googleEvent.meetingUrl || booking.meetingUrl,
          locationValue: booking.locationType === 'google_meet'
            ? (googleEvent.meetingUrl || booking.locationValue)
            : booking.locationValue,
          metadata: JSON.stringify({
            ...parseBookingMetadata(booking.metadata),
            googleCalendar: {
              connectedCalendarId: googleEvent.connectedCalendarId,
              calendarId: googleEvent.calendarId,
              eventId: googleEvent.eventId,
              htmlLink: googleEvent.htmlLink || '',
            },
          }),
        }) || booking;
      }
    }

    // Send emails
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const dateTimeStr = format(start, 'EEEE, MMMM d, yyyy h:mm a');

    if (host) {
      // Send confirmation to invitee
      const googleCalendarInviteUrl = parseBookingMetadata(bookingRecord.metadata)?.googleCalendar?.htmlLink || null;
      const fallbackMeetingUrl = normalizeHttpUrl(bookingRecord.meetingUrl)
        || normalizeHttpUrl(bookingRecord.locationValue);
      const emailLocation = bookingRecord.locationType === 'google_meet'
        ? 'Google Meet'
        : (fallbackMeetingUrl
          || bookingRecord.locationValue
          || locationType);
      const icsInvite = buildBookingIcsInvite({
        bookingUid: bookingRecord.uid,
        eventTitle: et.title,
        startTime: bookingRecord.startTime,
        endTime: bookingRecord.endTime,
        hostName: host.name,
        hostEmail: host.email,
        inviteeName,
        inviteeEmail,
        description: `Meeting booked via Kalendrio with ${host.name}.`,
        location: emailLocation,
        meetingUrl: fallbackMeetingUrl,
        calendarInviteUrl: googleCalendarInviteUrl,
        appUrl,
      });
      const calendarInviteAttachment = {
        filename: `kalendrio-${bookingRecord.uid}.ics`,
        content: Buffer.from(icsInvite, 'utf-8').toString('base64'),
        contentType: 'text/calendar; method=REQUEST; charset=UTF-8',
      };
      const confirmEmail = bookingConfirmationEmail({
        inviteeName,
        hostName: host.name,
        eventTitle: et.title,
        dateTime: dateTimeStr,
        timezone: timezone || 'America/New_York',
        duration: et.duration,
        location: emailLocation,
        meetingUrl: fallbackMeetingUrl,
        calendarInviteUrl: googleCalendarInviteUrl,
        cancelUrl: `${appUrl}/booking/${bookingRecord.uid}/cancel?token=${bookingRecord.cancelToken}`,
        rescheduleUrl: `${appUrl}/booking/${bookingRecord.uid}/reschedule?token=${bookingRecord.rescheduleToken}`,
      });
      confirmEmail.to = inviteeEmail;
      confirmEmail.attachments = [calendarInviteAttachment];
      const confirmEmailPromise = sendEmail(confirmEmail);

      // Send notification to host
      const hostEmail = hostNotificationEmail({
        hostName: host.name,
        inviteeName,
        inviteeEmail,
        eventTitle: et.title,
        dateTime: dateTimeStr,
        timezone: timezone || 'America/New_York',
        duration: et.duration,
        location: emailLocation,
        meetingUrl: fallbackMeetingUrl,
        calendarInviteUrl: googleCalendarInviteUrl,
      });
      hostEmail.to = host.email;
      hostEmail.attachments = [calendarInviteAttachment];
      const hostEmailPromise = sendEmail(hostEmail);

      const [inviteeEmailResult, hostEmailResult] = await Promise.allSettled([
        confirmEmailPromise,
        hostEmailPromise,
      ]);

      if (inviteeEmailResult.status !== 'fulfilled' || !inviteeEmailResult.value) {
        console.error('Failed to send booking confirmation email', {
          bookingId: bookingRecord.id,
          inviteeEmail,
        });
      }

      if (hostEmailResult.status !== 'fulfilled' || !hostEmailResult.value) {
        console.error('Failed to send host booking notification email', {
          bookingId: bookingRecord.id,
          hostEmail: host.email,
        });
      }
    }

    return NextResponse.json({
      booking: {
        id: bookingRecord.id,
        uid: bookingRecord.uid,
        startTime: bookingRecord.startTime,
        endTime: bookingRecord.endTime,
        status: bookingRecord.status,
        cancelToken: bookingRecord.cancelToken,
        rescheduleToken: bookingRecord.rescheduleToken,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Booking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { describe, it, expect } from 'vitest';
import {
  bookingConfirmationEmail,
  hostNotificationEmail,
  reminderEmail,
  cancellationEmail,
} from '@/lib/email';

describe('email templates', () => {
  describe('bookingConfirmationEmail', () => {
    const data = {
      inviteeName: 'Jane Doe',
      hostName: 'John Smith',
      eventTitle: '30 Min Meeting',
      dateTime: 'Monday, January 15, 2026 at 10:00 AM',
      timezone: 'America/New_York',
      duration: 30,
      location: 'Google Meet',
      meetingUrl: 'https://meet.google.com/abc-defg-hij',
      calendarInviteUrl: 'https://calendar.google.com/event?eid=xxx',
      cancelUrl: 'http://localhost:3000/booking/uid-123/cancel?token=abc',
      rescheduleUrl: 'http://localhost:3000/booking/uid-123/reschedule?token=def',
    };

    it('generates correct subject line', () => {
      const email = bookingConfirmationEmail(data);
      expect(email.subject).toBe('Confirmed: 30 Min Meeting with John Smith');
    });

    it('includes invitee name in html body', () => {
      const email = bookingConfirmationEmail(data);
      expect(email.html).toContain('Jane Doe');
    });

    it('includes meeting details in html', () => {
      const email = bookingConfirmationEmail(data);
      expect(email.html).toContain('30 Min Meeting');
      expect(email.html).toContain('30 minutes');
      expect(email.html).toContain('Google Meet');
    });

    it('includes cancel and reschedule links', () => {
      const email = bookingConfirmationEmail(data);
      expect(email.html).toContain(data.cancelUrl);
      expect(email.html).toContain(data.rescheduleUrl);
    });

    it('includes meeting URL when provided', () => {
      const email = bookingConfirmationEmail(data);
      expect(email.html).toContain(data.meetingUrl!);
    });

    it('omits meeting URL section when not provided', () => {
      const email = bookingConfirmationEmail({ ...data, meetingUrl: null });
      expect(email.html).not.toContain('Join meeting');
    });

    it('includes plain text version', () => {
      const email = bookingConfirmationEmail(data);
      expect(email.text).toContain('30 Min Meeting');
      expect(email.text).toContain('John Smith');
    });

    it('sets to field as empty string (caller sets it)', () => {
      const email = bookingConfirmationEmail(data);
      expect(email.to).toBe('');
    });
  });

  describe('hostNotificationEmail', () => {
    const data = {
      hostName: 'John Smith',
      inviteeName: 'Jane Doe',
      inviteeEmail: 'jane@example.com',
      eventTitle: 'Discovery Call',
      dateTime: 'Tuesday, January 16, 2026 at 2:00 PM',
      timezone: 'America/New_York',
      duration: 45,
      location: 'Zoom',
      meetingUrl: null,
      calendarInviteUrl: null,
    };

    it('generates correct subject line', () => {
      const email = hostNotificationEmail(data);
      expect(email.subject).toBe('New booking: Discovery Call with Jane Doe');
    });

    it('includes invitee details', () => {
      const email = hostNotificationEmail(data);
      expect(email.html).toContain('Jane Doe');
      expect(email.html).toContain('jane@example.com');
    });
  });

  describe('reminderEmail', () => {
    const baseData = {
      recipientName: 'Test User',
      eventTitle: 'Demo',
      dateTime: 'Wed Jan 17 2026 3:00 PM',
      timezone: 'America/New_York',
      duration: 30,
      location: 'Google Meet',
    };

    it('formats minutes correctly', () => {
      const email = reminderEmail({ ...baseData, minutesBefore: 30 });
      expect(email.subject).toContain('30 minutes');
    });

    it('formats hours correctly', () => {
      const email = reminderEmail({ ...baseData, minutesBefore: 120 });
      expect(email.subject).toContain('2 hour(s)');
    });

    it('formats days correctly', () => {
      const email = reminderEmail({ ...baseData, minutesBefore: 1440 });
      expect(email.subject).toContain('1 day(s)');
    });
  });

  describe('cancellationEmail', () => {
    it('generates correct subject', () => {
      const email = cancellationEmail({
        recipientName: 'User',
        eventTitle: 'Meeting',
        dateTime: '2026-01-20 10:00',
        cancelledBy: 'host',
      });
      expect(email.subject).toBe('Cancelled: Meeting');
    });

    it('includes cancel reason when provided', () => {
      const email = cancellationEmail({
        recipientName: 'User',
        eventTitle: 'Meeting',
        dateTime: '2026-01-20 10:00',
        cancelledBy: 'host',
        reason: 'Schedule conflict',
      });
      expect(email.html).toContain('Schedule conflict');
      expect(email.text).toContain('Schedule conflict');
    });

    it('omits reason section when not provided', () => {
      const email = cancellationEmail({
        recipientName: 'User',
        eventTitle: 'Meeting',
        dateTime: '2026-01-20 10:00',
        cancelledBy: 'host',
      });
      expect(email.html).not.toContain('Reason:');
    });
  });
});

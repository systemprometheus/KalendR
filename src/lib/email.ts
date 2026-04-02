const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'kalendr.io <onboarding@resend.dev>';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType?: string;
  }>;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (!RESEND_API_KEY) {
      console.log(`[EMAIL - NO API KEY] To: ${options.to}, Subject: ${options.subject}`);
      console.log(`[EMAIL] Body preview: ${options.text?.substring(0, 200) || 'HTML only'}`);
      return true;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
        attachments: options.attachments,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Resend API error:', error);
      return false;
    }

    const data = await response.json();
    console.log(`[EMAIL SENT] To: ${options.to}, ID: ${data.id}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

export function bookingConfirmationEmail(data: {
  inviteeName: string;
  hostName: string;
  eventTitle: string;
  dateTime: string;
  timezone: string;
  duration: number;
  location: string;
  cancelUrl: string;
  rescheduleUrl: string;
}): EmailOptions {
  return {
    to: '', // set by caller
    subject: `Confirmed: ${data.eventTitle} with ${data.hostName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #03b2d1; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Meeting Confirmed</h1>
        </div>
        <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb;">
          <p style="margin: 0 0 16px; color: #374151;">Hi ${data.inviteeName},</p>
          <p style="margin: 0 0 24px; color: #374151;">Your meeting has been scheduled.</p>

          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 12px; font-size: 18px; color: #111827;">${data.eventTitle}</h2>
            <p style="margin: 0 0 8px; color: #6b7280;">
              <strong>When:</strong> ${data.dateTime} (${data.timezone})
            </p>
            <p style="margin: 0 0 8px; color: #6b7280;">
              <strong>Duration:</strong> ${data.duration} minutes
            </p>
            <p style="margin: 0 0 8px; color: #6b7280;">
              <strong>With:</strong> ${data.hostName}
            </p>
            <p style="margin: 0; color: #6b7280;">
              <strong>Where:</strong> ${data.location}
            </p>
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${data.rescheduleUrl}" style="display: inline-block; margin-right: 12px; padding: 10px 20px; background: #f3f4f6; color: #374151; text-decoration: none; border-radius: 6px; font-size: 14px;">Reschedule</a>
            <a href="${data.cancelUrl}" style="display: inline-block; padding: 10px 20px; background: #fee2e2; color: #dc2626; text-decoration: none; border-radius: 6px; font-size: 14px;">Cancel</a>
          </div>
        </div>
        <div style="padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
          Powered by kalendr.io
        </div>
      </div>
    `,
    text: `Meeting Confirmed: ${data.eventTitle} with ${data.hostName}\n\nWhen: ${data.dateTime} (${data.timezone})\nDuration: ${data.duration} minutes\nWhere: ${data.location}\n\nReschedule: ${data.rescheduleUrl}\nCancel: ${data.cancelUrl}`,
  };
}

export function hostNotificationEmail(data: {
  hostName: string;
  inviteeName: string;
  inviteeEmail: string;
  eventTitle: string;
  dateTime: string;
  timezone: string;
  duration: number;
  location: string;
}): EmailOptions {
  return {
    to: '', // set by caller
    subject: `New booking: ${data.eventTitle} with ${data.inviteeName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #03b2d1; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">New Meeting Booked</h1>
        </div>
        <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb;">
          <p style="margin: 0 0 16px; color: #374151;">Hi ${data.hostName},</p>
          <p style="margin: 0 0 24px; color: #374151;">A new meeting has been booked with you.</p>

          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 12px; font-size: 18px; color: #111827;">${data.eventTitle}</h2>
            <p style="margin: 0 0 8px; color: #6b7280;"><strong>When:</strong> ${data.dateTime} (${data.timezone})</p>
            <p style="margin: 0 0 8px; color: #6b7280;"><strong>Duration:</strong> ${data.duration} minutes</p>
            <p style="margin: 0 0 8px; color: #6b7280;"><strong>Invitee:</strong> ${data.inviteeName} (${data.inviteeEmail})</p>
            <p style="margin: 0; color: #6b7280;"><strong>Where:</strong> ${data.location}</p>
          </div>
        </div>
        <div style="padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">Powered by kalendr.io</div>
      </div>
    `,
    text: `New booking: ${data.eventTitle}\n\nInvitee: ${data.inviteeName} (${data.inviteeEmail})\nWhen: ${data.dateTime} (${data.timezone})\nDuration: ${data.duration} minutes\nWhere: ${data.location}`,
  };
}

export function reminderEmail(data: {
  recipientName: string;
  eventTitle: string;
  dateTime: string;
  timezone: string;
  duration: number;
  location: string;
  minutesBefore: number;
}): EmailOptions {
  const timeLabel = data.minutesBefore >= 1440
    ? `${Math.floor(data.minutesBefore / 1440)} day(s)`
    : data.minutesBefore >= 60
    ? `${Math.floor(data.minutesBefore / 60)} hour(s)`
    : `${data.minutesBefore} minutes`;

  return {
    to: '',
    subject: `Reminder: ${data.eventTitle} in ${timeLabel}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f59e0b; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Meeting Reminder</h1>
        </div>
        <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb;">
          <p style="margin: 0 0 16px; color: #374151;">Hi ${data.recipientName},</p>
          <p style="margin: 0 0 24px; color: #374151;">Your meeting is coming up in ${timeLabel}.</p>
          <div style="background: #f9fafb; border-radius: 8px; padding: 20px;">
            <h2 style="margin: 0 0 12px; font-size: 18px; color: #111827;">${data.eventTitle}</h2>
            <p style="margin: 0 0 8px; color: #6b7280;"><strong>When:</strong> ${data.dateTime} (${data.timezone})</p>
            <p style="margin: 0 0 8px; color: #6b7280;"><strong>Duration:</strong> ${data.duration} minutes</p>
            <p style="margin: 0; color: #6b7280;"><strong>Where:</strong> ${data.location}</p>
          </div>
        </div>
      </div>
    `,
    text: `Reminder: ${data.eventTitle} in ${timeLabel}\n\nWhen: ${data.dateTime}\nDuration: ${data.duration} min\nWhere: ${data.location}`,
  };
}

export function cancellationEmail(data: {
  recipientName: string;
  eventTitle: string;
  dateTime: string;
  cancelledBy: string;
  reason?: string;
}): EmailOptions {
  return {
    to: '',
    subject: `Cancelled: ${data.eventTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #ef4444; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Meeting Cancelled</h1>
        </div>
        <div style="padding: 32px; background: #fff; border: 1px solid #e5e7eb;">
          <p style="margin: 0 0 16px; color: #374151;">Hi ${data.recipientName},</p>
          <p style="margin: 0 0 24px; color: #374151;">The following meeting has been cancelled by ${data.cancelledBy}.</p>
          <div style="background: #f9fafb; border-radius: 8px; padding: 20px;">
            <h2 style="margin: 0 0 12px; font-size: 18px; color: #111827;">${data.eventTitle}</h2>
            <p style="margin: 0; color: #6b7280;"><strong>Was scheduled for:</strong> ${data.dateTime}</p>
            ${data.reason ? `<p style="margin: 8px 0 0; color: #6b7280;"><strong>Reason:</strong> ${data.reason}</p>` : ''}
          </div>
        </div>
      </div>
    `,
    text: `Meeting Cancelled: ${data.eventTitle}\nWas scheduled for: ${data.dateTime}\nCancelled by: ${data.cancelledBy}${data.reason ? `\nReason: ${data.reason}` : ''}`,
  };
}

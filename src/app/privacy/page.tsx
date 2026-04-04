import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage from '@/components/legal/legal-page';

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@kalendr.io';

export const metadata: Metadata = {
  title: 'Privacy Policy | Kalendrio',
  description:
    'Learn what information Kalendrio collects, how it uses connected calendar data, and how users can request deletion or support.',
  alternates: {
    canonical: 'https://kalendr.io/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy Policy"
      title="How Kalendrio collects, uses, and protects your information"
      summary="This Privacy Policy explains what information Kalendrio collects when you use the product, why we process it, and the choices you have around access, deletion, and connected integrations."
      effectiveDate="April 4, 2026"
      contactEmail={SUPPORT_EMAIL}
      sections={[
        {
          title: 'Information we collect',
          body: [
            'Kalendrio collects information you provide directly, such as your name, email address, profile details, event types, routing forms, booking settings, availability preferences, and support messages.',
            'We also collect operational product data needed to run the service, including booking records, invitee responses, integration identifiers, workspace membership, and billing-related state when you use paid plans.',
          ],
          bullets: [
            'Account information such as name, email address, login provider, and authentication metadata.',
            'Scheduling information such as event types, booking links, availability rules, buffers, routing logic, and team assignments.',
            'Booking and contact information submitted by invitees, including names, email addresses, time selections, responses to booking questions, and reschedule or cancellation activity.',
            'Integration metadata for services you connect, such as calendar identifiers, OAuth tokens, and webhook state needed to keep bookings synchronized.',
          ],
        },
        {
          title: 'How we use information',
          body: [
            'Kalendrio uses personal information to provide scheduling, booking, routing, calendar synchronization, account security, billing, support, and product improvement.',
            'We process data only to operate the service you request, maintain reliability, prevent abuse, and communicate transactional information such as confirmations, reminders, and account notices.',
          ],
        },
        {
          title: 'How Google Calendar data is used',
          body: [
            'When you connect Google Calendar, Kalendrio accesses Google user data only to support features you enable inside the product. Google Calendar information is not used for advertising and is not sold to third parties.',
            'Google data is used to prevent conflicts, create and update scheduled events, support Google Meet generation when selected, and keep booking records synchronized when event details change.',
          ],
          bullets: [
            'Read your calendar list so you can choose which calendars to connect.',
            'Check free and busy times to prevent double-booking.',
            'Create, update, and delete booking events on calendars you authorize.',
            'Generate Google Meet conferencing details when that workflow is enabled.',
            'Reconcile booking changes made in Google Calendar so Kalendrio stays accurate.',
          ],
        },
        {
          title: 'OAuth scopes and connected services',
          body: [
            'Kalendrio requests only the permissions required for the implemented product flows in this application. For Google integrations, those scopes currently include access to free/busy data, calendar events, calendar list metadata, and the signed-in email address.',
            'If you connect additional services such as Microsoft calendars, Stripe, Zoom, Slack, Salesforce, or HubSpot, Kalendrio will process the limited account and event data required to deliver that integration.',
          ],
          bullets: [
            'https://www.googleapis.com/auth/calendar.freebusy',
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
            'https://www.googleapis.com/auth/userinfo.email',
          ],
        },
        {
          title: 'Sharing and subprocessors',
          body: [
            'Kalendrio shares information only with service providers, infrastructure vendors, and third-party integrations that are needed to operate the platform or that you choose to connect.',
            'We do not sell personal information. We may disclose information if required by law, to enforce our agreements, or to protect the rights, safety, and security of Kalendrio, our users, or others.',
          ],
        },
        {
          title: 'Retention, deletion, and your choices',
          body: [
            <>
              You can disconnect integrations from your account settings at any time to stop future synchronization. You can also request deletion of relevant connected data using the{' '}
              <Link href="/data-deletion" className="font-medium text-cyan-200 underline decoration-cyan-400/40 underline-offset-4 hover:text-white">
                data deletion page
              </Link>
              .
            </>,
            'We retain information for as long as needed to provide the service, meet legal or accounting obligations, resolve disputes, and enforce agreements. When data is no longer required, we delete or anonymize it within a reasonable period.',
          ],
        },
        {
          title: 'Security and international processing',
          body: [
            'Kalendrio uses reasonable administrative, technical, and organizational safeguards designed to protect account information and connected service credentials. No method of storage or transmission is completely secure, so we cannot guarantee absolute security.',
            'By using Kalendrio, you understand that information may be processed in countries where our service providers operate. We take steps intended to ensure those transfers are handled with appropriate protections.',
          ],
        },
        {
          title: 'Contact us',
          body: [
            <>
              For privacy requests, Google API data-use questions, or account-related concerns, email{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-cyan-200 underline decoration-cyan-400/40 underline-offset-4 hover:text-white">
                {SUPPORT_EMAIL}
              </a>
              .
            </>,
          ],
        },
      ]}
    />
  );
}

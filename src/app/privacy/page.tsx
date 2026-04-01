import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link href="/landing" className="text-sm font-medium text-[#03b2d1] hover:text-[#0292ab]">
            Back to KalendR
          </Link>
        </div>

        <div className="prose prose-gray max-w-none">
          <h1>Privacy Policy</h1>
          <p>Last updated: April 2, 2026</p>

          <p>
            KalendR helps teams collect booking requests, manage scheduling availability, and coordinate
            meetings. This page explains what information we collect, how we use it, and the controls
            available to our users.
          </p>

          <h2>Information we collect</h2>
          <p>
            We collect account details such as your name, email address, timezone, and profile settings.
            When invitees book meetings through KalendR, we also store the booking details you choose to
            collect, such as name, email address, company, phone number, notes, and custom form answers.
          </p>

          <h2>Google Calendar data</h2>
          <p>
            If you connect Google Calendar, KalendR requests access to the calendars you choose for
            conflict checking so it can hide unavailable slots and reduce double-bookings. If you select a
            Google calendar as your add-to calendar, KalendR also creates, updates, and deletes booking
            events on that calendar. For bookings configured to use Google Meet, KalendR requests Google
            Meet conference details through the created calendar event.
          </p>

          <p>
            Google Calendar data is used only to provide user-facing scheduling functionality inside
            KalendR. KalendR&apos;s use of information received from Google APIs will adhere to the
            Google API Services User Data Policy, including the Limited Use requirements.
          </p>

          <h2>How we use data</h2>
          <p>
            We use personal data to authenticate users, display booking pages, process bookings, send
            scheduling emails, prevent conflicts, and support the operation and security of the service.
          </p>

          <h2>Sharing</h2>
          <p>
            KalendR does not sell personal data. We share information only with service providers needed
            to operate the platform, such as hosting, email delivery, billing, and calendar providers, or
            when required by law.
          </p>

          <h2>Retention</h2>
          <p>
            We retain account and booking data for as long as your account remains active or as needed to
            provide the service, resolve disputes, comply with legal obligations, and enforce agreements.
          </p>

          <h2>Your choices</h2>
          <p>
            You can disconnect integrations, update profile information, or request deletion of your
            account data. For deletion requests, see the <Link href="/data-deletion">data deletion page</Link>.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about privacy can be sent to <a href="mailto:support@kalendr.io">support@kalendr.io</a>.
          </p>
        </div>
      </div>
    </main>
  );
}

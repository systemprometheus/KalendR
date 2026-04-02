import Link from 'next/link';

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@kalendr.io';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-sm font-medium text-[#03b2d1]">Privacy Policy</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">How KalendR handles your data</h1>
          <p className="mt-3 text-sm leading-7 text-gray-500">
            Effective date: April 2, 2026
          </p>
        </div>

        <div className="space-y-8 text-sm leading-7 text-gray-700">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">What KalendR stores</h2>
            <p className="mt-2">
              KalendR stores the information needed to power scheduling, including account details,
              availability settings, event types, bookings, and connected integration metadata.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">How Google Calendar data is used</h2>
            <p className="mt-2">
              When you connect Google Calendar, KalendR uses Google data only to support scheduling
              features you enable inside the product.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-600">
              <li>Read your calendar list so you can choose which calendars to use.</li>
              <li>Check busy times to prevent booking conflicts.</li>
              <li>Create, update, and delete booking events on the calendar you connect for bookings.</li>
              <li>Create a Google Meet link when an event type uses Google Meet.</li>
              <li>Reconcile Google-side event changes so KalendR bookings stay in sync.</li>
            </ul>
            <p className="mt-3">
              KalendR does not use Google user data for advertising and does not sell Google user data
              to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">Google OAuth scopes in use</h2>
            <p className="mt-2">
              KalendR requests the minimum Google Calendar scopes needed for implemented features:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 font-mono text-xs text-gray-600 sm:text-sm">
              <li>https://www.googleapis.com/auth/calendar.events.freebusy</li>
              <li>https://www.googleapis.com/auth/calendar.events</li>
              <li>https://www.googleapis.com/auth/calendar.calendarlist.readonly</li>
              <li>https://www.googleapis.com/auth/userinfo.email</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">Sharing</h2>
            <p className="mt-2">
              KalendR shares data only with service providers and integrations needed to deliver the
              product, such as email delivery, video meeting, CRM, payment, or calendar services that
              you choose to connect.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">Retention and deletion</h2>
            <p className="mt-2">
              You can disconnect Google Calendar from the integrations dashboard at any time to stop
              future synchronization. For Google-related deletion requests, review the{' '}
              <Link href="/data-deletion" className="text-[#03b2d1] hover:underline">
                data deletion page
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">Contact</h2>
            <p className="mt-2">
              For privacy or Google API data-use questions, contact{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#03b2d1] hover:underline">
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

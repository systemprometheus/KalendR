import Link from 'next/link';

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@kalendr.io';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-sm font-medium text-[#03b2d1]">Terms of Service</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Terms for using KalendR</h1>
          <p className="mt-3 text-sm leading-7 text-gray-500">
            Effective date: April 2, 2026
          </p>
        </div>

        <div className="space-y-8 text-sm leading-7 text-gray-700">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">Use of the service</h2>
            <p className="mt-2">
              KalendR provides scheduling, routing, booking, and integration features for individuals
              and teams. You agree to use the service lawfully and only for legitimate business or
              personal scheduling purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">Accounts and integrations</h2>
            <p className="mt-2">
              You are responsible for securing your account and any third-party integrations you connect.
              By connecting a calendar, CRM, or payment service, you confirm that you have authority to
              grant KalendR access to that account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">Availability and third-party services</h2>
            <p className="mt-2">
              KalendR depends on third-party APIs such as Google Calendar, Microsoft, Zoom, and Stripe.
              Availability of those services may affect product behavior. KalendR cannot guarantee
              uninterrupted access to third-party platforms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">Data and privacy</h2>
            <p className="mt-2">
              Your use of KalendR is also governed by the{' '}
              <Link href="/privacy" className="text-[#03b2d1] hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">Contact</h2>
            <p className="mt-2">
              Questions about these terms can be sent to{' '}
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

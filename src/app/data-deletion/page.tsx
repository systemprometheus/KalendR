const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@kalendr.io';

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-sm font-medium text-[#03b2d1]">Data Deletion</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">How to delete Google-connected data</h1>
          <p className="mt-3 text-sm leading-7 text-gray-500">
            Effective date: April 2, 2026
          </p>
        </div>

        <div className="space-y-8 text-sm leading-7 text-gray-700">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">Disconnect Google Calendar</h2>
            <p className="mt-2">
              To stop future synchronization, remove or disconnect the Google Calendar integration from
              the KalendR integrations dashboard. Once disconnected, KalendR will no longer create,
              update, or delete future Google Calendar events on your behalf.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">Request deletion</h2>
            <p className="mt-2">
              To request deletion of stored Google connection metadata or associated scheduling data,
              email{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#03b2d1] hover:underline">
                {SUPPORT_EMAIL}
              </a>
              {' '}from the account email tied to your KalendR workspace.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">What is removed</h2>
            <p className="mt-2">
              Deletion requests may include stored OAuth connection metadata, selected calendar settings,
              and Google event linkage stored on bookings. Existing events already written to your Google
              Calendar remain under your Google account unless you delete them there as well.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link href="/landing" className="text-sm font-medium text-[#03b2d1] hover:text-[#0292ab]">
            Back to KalendR
          </Link>
        </div>

        <div className="prose prose-gray max-w-none">
          <h1>Data Deletion</h1>
          <p>Last updated: April 2, 2026</p>

          <p>
            KalendR users can request deletion of account and integration data by emailing
            {' '}<a href="mailto:support@kalendr.io">support@kalendr.io</a> from the email address associated
            with the account.
          </p>

          <h2>What to include</h2>
          <p>
            Please include your account email address and state whether you want us to delete your full
            account, revoke connected integrations, or remove only specific booking data.
          </p>

          <h2>What we delete</h2>
          <p>
            When a deletion request is completed, KalendR will remove or anonymize the applicable account
            profile, connected calendar tokens, and booking-related data from active systems unless we are
            required to retain some records for legal, security, or billing reasons.
          </p>

          <h2>Google Calendar connection removal</h2>
          <p>
            If you connected Google Calendar, deleting your KalendR account or requesting integration
            removal will delete stored Google OAuth tokens from KalendR and stop future event creation on
            your selected add-to calendar. You can also revoke KalendR access directly from your Google
            Account permissions page.
          </p>

          <h2>Response time</h2>
          <p>
            We aim to respond to deletion requests within 7 business days.
          </p>
        </div>
      </div>
    </main>
  );
}

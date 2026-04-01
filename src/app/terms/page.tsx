import Link from 'next/link';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link href="/landing" className="text-sm font-medium text-[#03b2d1] hover:text-[#0292ab]">
            Back to KalendR
          </Link>
        </div>

        <div className="prose prose-gray max-w-none">
          <h1>Terms of Service</h1>
          <p>Last updated: April 2, 2026</p>

          <p>
            These Terms of Service govern your use of KalendR. By using the service, you agree to these
            terms.
          </p>

          <h2>Use of the service</h2>
          <p>
            You may use KalendR to create booking pages, accept meeting requests, manage availability, and
            coordinate scheduling workflows for lawful business purposes.
          </p>

          <h2>Your responsibilities</h2>
          <p>
            You are responsible for the information you publish through KalendR, for maintaining the
            security of your account, and for using integrations in compliance with the policies of the
            third-party services you connect.
          </p>

          <h2>Third-party services</h2>
          <p>
            KalendR may integrate with third-party providers such as Google, Microsoft, Stripe, Zoom, and
            email delivery services. Your use of those integrations is also subject to the terms and
            policies of those providers.
          </p>

          <h2>Availability</h2>
          <p>
            We work to keep the service available and reliable, but KalendR is provided on an as-is basis
            and may change over time.
          </p>

          <h2>Termination</h2>
          <p>
            You may stop using KalendR at any time. We may suspend or terminate access if the service is
            used unlawfully, abusively, or in a way that threatens the security or integrity of the
            platform.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about these terms can be sent to <a href="mailto:support@kalendr.io">support@kalendr.io</a>.
          </p>
        </div>
      </div>
    </main>
  );
}

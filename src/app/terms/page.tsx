import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage from '@/components/legal/legal-page';

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@kalendr.io';

export const metadata: Metadata = {
  title: 'Terms and Conditions | Kalendrio',
  description:
    'Review the terms that govern access to Kalendrio, including account use, billing, connected integrations, and service limitations.',
  alternates: {
    canonical: 'https://kalendr.io/terms',
  },
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms and Conditions"
      title="The rules for using Kalendrio"
      summary="These Terms and Conditions govern your access to Kalendrio, including scheduling, booking, routing, billing, and third-party integrations available through the product."
      effectiveDate="April 4, 2026"
      contactEmail={SUPPORT_EMAIL}
      sections={[
        {
          title: 'Acceptance of terms',
          body: [
            'By accessing or using Kalendrio, you agree to be bound by these Terms and Conditions and by any policies referenced in them. If you are using the service on behalf of a company or other organization, you represent that you have authority to bind that entity.',
          ],
        },
        {
          title: 'Using the service',
          body: [
            'Kalendrio provides scheduling pages, lead routing, team booking workflows, calendar synchronization, and related productivity features for individuals and teams.',
            'You agree to use the service only for lawful business or personal scheduling purposes and not to interfere with the service, attempt unauthorized access, or use the platform to send spam, phishing content, or misleading booking flows.',
          ],
        },
        {
          title: 'Accounts and responsibilities',
          body: [
            'You are responsible for maintaining the confidentiality of your account credentials, for activity that occurs under your account, and for ensuring the accuracy of information you publish through your booking pages.',
            'If you connect calendars, email, payments, or other third-party services, you confirm that you are authorized to grant Kalendrio access to those accounts and that the connected content does not violate the rights of others.',
          ],
        },
        {
          title: 'Billing and paid plans',
          body: [
            'Some Kalendrio features may require payment. If you subscribe to a paid plan, you agree to pay all applicable fees, taxes, and recurring charges associated with your selected plan until it is canceled.',
            'Pricing, plan limits, and included features may change over time. Where required, changes will apply prospectively. Failure to pay may result in suspension or downgrade of paid functionality.',
          ],
        },
        {
          title: 'Third-party services and availability',
          body: [
            'Kalendrio depends on third-party platforms such as Google Calendar, Microsoft, Zoom, Slack, HubSpot, Salesforce, and Stripe for some workflows. Those services are controlled by their own operators and may change, become unavailable, or impose their own limits at any time.',
            'We do not guarantee uninterrupted or error-free operation of third-party integrations, and we are not responsible for outages, API changes, or data issues caused by services outside Kalendrio’s control.',
          ],
        },
        {
          title: 'Content, data, and privacy',
          body: [
            'You retain responsibility for the information you upload, publish, or collect through Kalendrio, including booking questions, contact records, and invitee communications. You represent that you have the necessary rights and permissions to use that information.',
            <>
              Our handling of personal data is described in the{' '}
              <Link href="/privacy" className="font-medium text-cyan-200 underline decoration-cyan-400/40 underline-offset-4 hover:text-white">
                Privacy Policy
              </Link>
              .
            </>,
          ],
        },
        {
          title: 'Termination',
          body: [
            'You may stop using Kalendrio at any time. We may suspend or terminate access if you violate these terms, create security risk, fail to pay applicable fees, or use the service in a way that could harm Kalendrio, other users, or third parties.',
            'Sections that by their nature should survive termination, including billing obligations, disclaimers, limitations of liability, and dispute-related provisions, will remain in effect after access ends.',
          ],
        },
        {
          title: 'Disclaimers and limitation of liability',
          body: [
            'Kalendrio is provided on an as-is and as-available basis to the maximum extent permitted by law. We disclaim implied warranties including merchantability, fitness for a particular purpose, and non-infringement.',
            'To the maximum extent permitted by law, Kalendrio will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for loss of profits, revenues, business opportunities, data, or goodwill arising from or related to your use of the service.',
          ],
        },
        {
          title: 'Changes to these terms',
          body: [
            'We may update these Terms and Conditions from time to time. When we do, we will post the updated version on this page and revise the effective date. Continued use of Kalendrio after an update becomes effective means you accept the revised terms.',
          ],
        },
        {
          title: 'Contact',
          body: [
            <>
              Questions about these terms can be sent to{' '}
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

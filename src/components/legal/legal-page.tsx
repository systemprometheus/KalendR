import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft, Mail, Shield } from 'lucide-react';
import Logo from '@/components/ui/logo';

type LegalSection = {
  title: string;
  body: ReactNode[];
  bullets?: string[];
};

interface LegalPageProps {
  eyebrow: string;
  title: string;
  summary: string;
  effectiveDate: string;
  sections: LegalSection[];
  contactEmail: string;
}

export default function LegalPage({
  eyebrow,
  title,
  summary,
  effectiveDate,
  sections,
  contactEmail,
}: LegalPageProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(3,178,209,0.16),_transparent_30%),linear-gradient(to_bottom,_#f8fdff,_#ffffff_28%,_#f8fafc_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 rounded-full border border-white/70 bg-white/80 px-5 py-3 shadow-sm backdrop-blur">
          <Logo size="sm" />
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to site
          </Link>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(320px,0.45fr)]">
          <section className="overflow-hidden rounded-[2rem] border border-sky-100 bg-[#0b1620] text-white shadow-[0_30px_80px_rgba(11,22,32,0.14)]">
            <div className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(3,178,209,0.28),rgba(3,178,209,0.04)_45%,rgba(255,255,255,0.02)_100%)] px-8 py-10 sm:px-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
                <Shield className="h-3.5 w-3.5" />
                {eyebrow}
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                {title}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                {summary}
              </p>
              <p className="mt-6 text-sm font-medium text-cyan-100/80">Effective date: {effectiveDate}</p>
            </div>

            <div className="space-y-8 px-8 py-10 sm:px-10">
              {sections.map((section) => (
                <section
                  key={section.title}
                  className="rounded-3xl border border-white/8 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                >
                  <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                  <div className="mt-4 space-y-4 text-sm leading-7 text-slate-300 sm:text-[15px]">
                    {section.body.map((paragraph, index) => (
                      <p key={`${section.title}-${index}`}>{paragraph}</p>
                    ))}
                  </div>
                  {section.bullets?.length ? (
                    <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-200 sm:text-[15px]">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-3">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-300" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-sky-100 bg-white p-7 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#03b2d1]">
                Need help?
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-gray-900">Questions about these terms?</h2>
              <p className="mt-3 text-sm leading-7 text-gray-600">
                Reach out if you need clarification about privacy, account data, billing, or how Kalendrio handles connected services.
              </p>
              <a
                href={`mailto:${contactEmail}`}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#03b2d1] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0292ab]"
              >
                <Mail className="h-4 w-4" />
                {contactEmail}
              </a>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Quick links
              </p>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <Link href="/privacy" className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-[#03b2d1]/40 hover:text-slate-900">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-[#03b2d1]/40 hover:text-slate-900">
                  Terms and Conditions
                </Link>
                <Link href="/data-deletion" className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-[#03b2d1]/40 hover:text-slate-900">
                  Data deletion
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#03b2d1]/20 bg-gradient-to-br from-[#effbfd] via-white to-[#d9f6fb] p-7">
              <p className="text-sm font-semibold text-gray-900">Transparency note</p>
              <p className="mt-3 text-sm leading-7 text-gray-600">
                These pages describe how Kalendrio operates today based on the product currently implemented in this workspace, including scheduling, bookings, routing, and connected calendar or billing integrations.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

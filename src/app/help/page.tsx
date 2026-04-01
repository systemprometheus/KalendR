import Link from 'next/link';
import Logo from '@/components/ui/logo';
import { HelpCenter } from '@/components/help/help-center';
import { getCurrentUser } from '@/lib/auth';

export default async function HelpPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-gray-900">
      <header className="sticky top-0 z-40 border-b border-white/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-10">
            <Link href={user ? '/dashboard' : '/landing'} className="shrink-0">
              <Logo size="md" />
            </Link>
            <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 lg:flex">
              <Link href="/landing#features" className="transition hover:text-gray-950">Product</Link>
              <Link href="/landing#how-it-works" className="transition hover:text-gray-950">Solutions</Link>
              <Link href="/help" className="text-gray-950">Resources</Link>
              <Link href="/landing#pricing" className="transition hover:text-gray-950">Pricing</Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={user ? '/dashboard' : '/login'}
              className="hidden rounded-full px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-950 sm:inline-flex"
            >
              {user ? 'Dashboard' : 'Log In'}
            </Link>
            <Link
              href={user ? '/dashboard/event-types?create=true' : '/signup'}
              className="inline-flex items-center rounded-full bg-[#0069ff] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0052cc]"
            >
              {user ? 'Create event' : 'Get started'}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <HelpCenter />
      </main>
    </div>
  );
}

'use client';
import Logo from '@/components/ui/logo';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12" style={{ background: 'linear-gradient(135deg, #03b2d1 0%, #0292ab 50%, #01788b 100%)' }}>
        <div className="max-w-md text-white">
          <div className="mb-8">
            <Logo size="xl" variant="light" />
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Book more qualified demos, faster.
          </h1>
          <p className="text-lg text-blue-100 leading-relaxed">
            The scheduling platform built for inbound sales teams. Route leads to the right rep, eliminate back-and-forth, and close deals faster.
          </p>
          <div className="mt-12 space-y-4">
            <div className="flex items-center gap-3 text-blue-100">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">✓</div>
              <span>Round-robin demo assignment</span>
            </div>
            <div className="flex items-center gap-3 text-blue-100">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">✓</div>
              <span>Lead qualification before booking</span>
            </div>
            <div className="flex items-center gap-3 text-blue-100">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">✓</div>
              <span>Embed on any website or landing page</span>
            </div>
            <div className="flex items-center gap-3 text-blue-100">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">✓</div>
              <span>Calendar sync & conflict prevention</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <Logo size="lg" variant="dark" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

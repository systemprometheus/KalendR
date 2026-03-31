'use client';
import { Calendar } from 'lucide-react';
import Link from 'next/link';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0069ff] items-center justify-center p-12">
        <div className="max-w-md text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold">KalendR</span>
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
            <div className="w-10 h-10 bg-[#0069ff] rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">KalendR</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Globe, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/ui/logo';
import { TIMEZONES, findMatchingTimezone, formatTimezoneLabel } from '@/lib/timezones';
import { Input } from '@/components/ui/input';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
}

function Select({ label, value, onChange, options }: SelectProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0069ff] text-sm"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Timezones imported from @/lib/timezones

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Form data
  const [timezone, setTimezone] = useState('America/New_York');
  const [slug, setSlug] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('Welcome! Please pick a time that works for you.');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          setSlug(data.user.slug || '');
          // Try to detect timezone
          try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (tz) setTimezone(findMatchingTimezone(tz));
          } catch {}
        } else {
          router.push('/login');
        }
      });
  }, [router]);

  const handleComplete = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timezone,
          slug,
          welcomeMessage,
          createDefaultEvents: true,
        }),
      });

      if (res.ok) {
        router.push('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Timezone', icon: Globe },
    { number: 2, title: 'Your URL', icon: Calendar },
    { number: 3, title: 'Ready!', icon: Check },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s.number} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s.number ? 'bg-[#0069ff] text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step > s.number ? <Check className="w-4 h-4" /> : s.number}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-1 ${step > s.number ? 'bg-[#0069ff]' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {step === 1 && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Set your timezone</h2>
              <p className="text-gray-500 mb-6">This ensures your availability shows correctly for people booking with you.</p>

              <Select
                label="Timezone"
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                options={TIMEZONES.map(tz => ({ value: tz.value, label: formatTimezoneLabel(tz) }))}
              />

              <div className="mt-8 flex justify-end">
                <Button onClick={() => setStep(2)} size="lg">
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Your booking URL</h2>
              <p className="text-gray-500 mb-6">This is the link you'll share with prospects and embed on your website.</p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Your URL</label>
                <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden">
                  <span className="px-3 py-2 bg-gray-50 text-sm text-gray-500 border-r border-gray-300">
                    kalendr.io/
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="flex-1 px-3 py-2 text-sm focus:outline-none"
                    placeholder="your-name"
                  />
                </div>
              </div>

              <Input
                label="Welcome Message (shown on your booking page)"
                value={welcomeMessage}
                onChange={e => setWelcomeMessage(e.target.value)}
                placeholder="Welcome! Pick a time that works best."
              />

              <div className="mt-8 flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setStep(3)} size="lg">
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">You're all set!</h2>
              <p className="text-gray-500 mb-2">We've created 3 sales-focused event types for you:</p>

              <div className="text-left bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#0069ff]" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Book a Demo</p>
                    <p className="text-xs text-gray-500">30 min • Google Meet</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Quick Discovery Call</p>
                    <p className="text-xs text-gray-500">15 min • Phone</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-violet-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Enterprise Demo</p>
                    <p className="text-xs text-gray-500">60 min • Google Meet</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button onClick={handleComplete} size="lg" loading={loading}>
                  Go to Dashboard <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

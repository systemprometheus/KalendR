'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '@/components/layout/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GoogleIcon, MicrosoftIcon } from '@/components/ui/brand-icons';
import { findMatchingTimezone } from '@/lib/timezones';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [timezone, setTimezone] = useState('America/New_York');

  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) {
        setTimezone(findMatchingTimezone(detected));
      }
    } catch {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, timezone }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Signup failed');
        return;
      }

      router.push('/onboarding');
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = (provider: string) => {
    const params = new URLSearchParams({
      intent: 'signup',
      timezone,
    });
    window.location.href = `/api/auth/${provider}?${params.toString()}`;
  };

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h2>
      <p className="text-gray-500 mb-8">Start booking more demos in minutes</p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* OAuth buttons */}
      <div className="space-y-3 mb-6">
        <button
          onClick={() => handleOAuth('google')}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border-2 border-[#03b2d1] bg-[#03b2d1] text-white font-medium hover:bg-[#0292ab] hover:border-[#0292ab] transition-colors"
        >
          <div className="w-7 h-7 bg-white rounded flex items-center justify-center flex-shrink-0">
            <GoogleIcon className="w-4.5 h-4.5" />
          </div>
          Sign up with Google
        </button>
        <button
          onClick={() => handleOAuth('microsoft')}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border-2 border-[#1a1a2e] bg-[#1a1a2e] text-white font-medium hover:bg-[#16162a] transition-colors"
        >
          <div className="w-7 h-7 bg-white rounded flex items-center justify-center flex-shrink-0">
            <MicrosoftIcon className="w-4.5 h-4.5" />
          </div>
          Sign up with Microsoft
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-sm text-gray-400">OR</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {!showEmailForm ? (
        <button
          onClick={() => setShowEmailForm(true)}
          className="w-full text-center text-sm font-medium"
        >
          <span className="text-[#03b2d1] hover:underline">Sign up free with email.</span>
          <span className="text-gray-400 ml-1">No credit card required.</span>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Jane Smith"
            required
          />
          <Input
            label="Work Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="jane@company.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            helperText="Must be at least 8 characters"
          />

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Create Account
          </Button>
        </form>
      )}

      <p className="mt-4 text-center text-xs text-gray-400">
        By signing up, you agree to our Terms of Service and Privacy Policy
      </p>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="text-[#03b2d1] hover:text-[#0292ab] font-medium">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '@/components/layout/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GoogleIcon, MicrosoftIcon } from '@/components/ui/brand-icons';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) setError(urlError.replace(/\+/g, ' '));
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = (provider: string) => {
    window.location.href = `/api/auth/${provider}?intent=login`;
  };

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h2>
      <p className="text-gray-500 mb-8">Sign in to your kalendr.io account</p>

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
          Sign in with Google
        </button>
        <button
          onClick={() => handleOAuth('microsoft')}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border-2 border-[#1a1a2e] bg-[#1a1a2e] text-white font-medium hover:bg-[#16162a] transition-colors"
        >
          <div className="w-7 h-7 bg-white rounded flex items-center justify-center flex-shrink-0">
            <MicrosoftIcon className="w-4.5 h-4.5" />
          </div>
          Sign in with Microsoft
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
          className="w-full text-center text-sm text-[#03b2d1] font-medium hover:underline"
        >
          Sign in with email and password
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded border-gray-300 text-[#03b2d1] focus:ring-[#03b2d1]" />
              <span className="text-sm text-gray-600">Remember me</span>
            </label>
            <Link href="/forgot-password" className="text-sm text-[#03b2d1] hover:text-[#0292ab]">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            Sign In
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-gray-500">
        Don't have an account?{' '}
        <Link href="/signup" className="text-[#03b2d1] hover:text-[#0292ab] font-medium">
          Sign up free
        </Link>
      </p>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

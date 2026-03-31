'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '@/components/layout/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

      if (!data.user.onboardingComplete) {
        router.push('/onboarding');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h2>
      <p className="text-gray-500 mb-8">Sign in to your KalendR account</p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}

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
            <input type="checkbox" className="rounded border-gray-300 text-[#0069ff] focus:ring-[#0069ff]" />
            <span className="text-sm text-gray-600">Remember me</span>
          </label>
          <Link href="/forgot-password" className="text-sm text-[#0069ff] hover:text-[#0052cc]">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Sign In
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don't have an account?{' '}
        <Link href="/signup" className="text-[#0069ff] hover:text-[#0052cc] font-medium">
          Sign up free
        </Link>
      </p>
    </AuthLayout>
  );
}

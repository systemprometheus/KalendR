'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '@/components/layout/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
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

  return (
    <AuthLayout>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h2>
      <p className="text-gray-500 mb-8">Start booking more demos in minutes</p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}

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

      <p className="mt-4 text-center text-xs text-gray-400">
        By signing up, you agree to our Terms of Service and Privacy Policy
      </p>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="text-[#0069ff] hover:text-[#0052cc] font-medium">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthLayout } from '@/components/layout/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/password-reset', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset</h2>
        <p className="text-gray-500">Redirecting to sign in...</p>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Set new password</h2>
      <p className="text-gray-500 mb-8">Enter your new password below</p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="New Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" required />
        <Input label="Confirm Password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm your password" required />
        <Button type="submit" className="w-full" size="lg" loading={loading}>Reset Password</Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<div>Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}

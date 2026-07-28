'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/auth-api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Reset your password</h2>
      <p className="text-sm text-gray-500 mb-6">Enter your email and we&apos;ll send you instructions.</p>

      {submitted ? (
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-4 text-sm text-green-700">
          If an account exists for <strong>{email}</strong>, you will receive password reset instructions.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="email"
            label="Email address"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
            Send instructions
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-gray-500 mt-6">
        Remember your password?{' '}
        <Link href="/login" className="font-medium text-gray-900 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}

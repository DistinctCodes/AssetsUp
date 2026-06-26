'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setNetworkError(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email }),
      });

      if (!res.ok && res.status >= 500) {
        // Treat 5xx as a network-level error; 4xx are intentionally swallowed
        // per the security best-practice of always returning 200.
        throw new Error('Server error. Please try again later.');
      }

      // Always show the success message regardless of whether the email exists.
      setSubmitted(true);
    } catch (err: unknown) {
      setNetworkError(
        (err as Error)?.message ?? 'Something went wrong. Please try again.',
      );
    }
  };

  if (submitted) {
    return (
      <>
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Check your inbox</h2>
          <p className="text-sm text-gray-500">
            If an account with that email exists, a reset link has been sent. Check your inbox.
          </p>
        </div>
        <Link
          href="/login"
          className="block text-center text-sm font-medium text-gray-900 hover:underline"
        >
          ← Back to Login
        </Link>
      </>
    );
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Forgot your password?</h2>
      <p className="text-sm text-gray-500 mb-6">
        Enter your email and we'll send you a reset link.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="email"
          label="Email address"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          {...register('email')}
          error={errors.email?.message}
        />

        {networkError && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {networkError}
          </p>
        )}

        <Button type="submit" size="lg" loading={isSubmitting} className="w-full mt-2">
          Send reset link
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        <Link href="/login" className="font-medium text-gray-900 hover:underline">
          ← Back to Login
        </Link>
      </p>
    </>
  );
}
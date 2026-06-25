'use client';

import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/auth-api';

const schema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
  });

  // ── Invalid / missing token ───────────────────────────────────────────────
  if (!token) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-red-500 text-xl font-bold">!</span>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid reset link</h2>
        <p className="text-sm text-gray-500 mb-6">
          This reset link is missing a token. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={22} className="text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Password reset</h2>
        <p className="text-sm text-gray-500 mb-1">
          Your password has been reset successfully.
        </p>
        <p className="text-xs text-gray-400">Redirecting you to sign in…</p>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      await authApi.resetPassword({ token, newPassword: values.newPassword });
      setSuccess(true);
      // Redirect to login after 2 seconds
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: any) {
      const status = err?.response?.status;
      const isExpired = status === 400 || status === 404;
      setError('root', {
        message: isExpired
          ? 'This reset link is invalid or has expired.'
          : (err?.response?.data?.message ?? 'Something went wrong. Please try again.'),
        type: isExpired ? 'expired' : 'generic',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Set new password</h2>
      <p className="text-sm text-gray-500 mb-6">
        Choose a new password for your account.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          id="newPassword"
          label="New password"
          type="password"
          placeholder="Min. 8 characters"
          autoComplete="new-password"
          {...register('newPassword')}
          error={errors.newPassword?.message}
        />

        <Input
          id="confirmPassword"
          label="Confirm new password"
          type="password"
          placeholder="Repeat your password"
          autoComplete="new-password"
          {...register('confirmPassword')}
          error={errors.confirmPassword?.message}
        />

        {errors.root && (
          <div role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
            <p>{errors.root.message}</p>
            {errors.root.type === 'expired' && (
              <Link
                href="/forgot-password"
                className="inline-block mt-1 text-xs font-medium text-red-700 underline hover:no-underline"
              >
                Request a new reset link
              </Link>
            )}
          </div>
        )}

        <Button type="submit" size="lg" loading={isLoading} className="w-full mt-2">
          Reset password
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Remember it?{' '}
        <Link href="/login" className="font-medium text-gray-900 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
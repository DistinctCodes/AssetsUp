'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: values.password });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(msg || 'Invalid or expired token. Please request a new reset link.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Reset Password</h2>
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-3 mt-4">
          No reset token found. Please request a new password reset link.
        </p>
      </>
    );
  }

  if (success) {
    return (
      <>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Password Reset</h2>
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-4 text-sm text-green-700 mt-4">
          Your password has been reset successfully. Redirecting to login...
        </div>
      </>
    );
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Reset your password</h2>
      <p className="text-sm text-gray-500 mb-6">Enter a new password for your account.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input id="password" label="New password" type="password" placeholder="********" autoComplete="new-password" {...register('password')} error={errors.password?.message} />
        <Input id="confirmPassword" label="Confirm new password" type="password" placeholder="********" autoComplete="new-password" {...register('confirmPassword')} error={errors.confirmPassword?.message} />
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        <Button type="submit" size="lg" loading={loading} className="w-full mt-2">Reset password</Button>
      </form>
    </>
  );
}
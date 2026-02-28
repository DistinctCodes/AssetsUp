'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth.store';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isLoading } = useAuthStore();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await registerUser(values);
      router.push('/dashboard');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Something went wrong. Please try again.';
      setError('root', { message });
    }
  };

  return (
    <>
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Create your account</h2>
      <p className="text-sm text-gray-500 mb-6">Start managing your assets today</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="firstName"
            label="First name"
            placeholder="John"
            autoComplete="given-name"
            {...register('firstName')}
            error={errors.firstName?.message}
          />
          <Input
            id="lastName"
            label="Last name"
            placeholder="Doe"
            autoComplete="family-name"
            {...register('lastName')}
            error={errors.lastName?.message}
          />
        </div>

        <Input
          id="email"
          label="Email address"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          {...register('email')}
          error={errors.email?.message}
        />

        <Input
          id="password"
          label="Password"
          type="password"
          placeholder="Min. 8 characters"
          autoComplete="new-password"
          {...register('password')}
          error={errors.password?.message}
        />

        {errors.root && (
          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {errors.root.message}
          </p>
        )}

        <Button type="submit" size="lg" loading={isLoading} className="w-full mt-2">
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-gray-900 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}

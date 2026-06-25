'use client';

import { Suspense, useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth.store';
import { useLoginMutation } from '@/lib/query/mutations/auth';

// ── Step 1: Email + password ─────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type LoginValues = z.infer<typeof loginSchema>;

// ── Step 2: TOTP code ────────────────────────────────────────────────────────
const totpSchema = z.object({
  code: z
    .string()
    .length(6, 'Code must be exactly 6 digits')
    .regex(/^\d+$/, 'Code must contain digits only'),
});
type TotpValues = z.infer<typeof totpSchema>;

// ── TOTP input — auto-focus, digits only ────────────────────────────────────
function TotpStep({
  onBack,
  onSuccess,
}: {
  onBack: () => void;
  onSuccess: () => void;
}) {
  const isLoading = useAuthStore((s) => s.isLoading);
  const verifyTwoFactor = useAuthStore((s) => s.verifyTwoFactor);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<TotpValues>({
    resolver: zodResolver(totpSchema),
  });

  useEffect(() => {
    // Auto-focus the code input when step 2 mounts
    inputRef.current?.focus();
  }, []);

  const onSubmit = async (values: TotpValues) => {
    try {
      await verifyTwoFactor(values.code);
      onSuccess();
    } catch (err: any) {
      const message =
        err?.response?.status === 401
          ? 'Incorrect code. Try again.'
          : (err?.response?.data?.message ?? 'Something went wrong. Please try again.');
      setError('code', { message });
      reset({ code: '' });
      inputRef.current?.focus();
    }
  };

  return (
    <div className="animate-in slide-in-from-right-4 duration-300">
      {/* Icon + heading */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <ShieldCheck size={22} className="text-gray-700" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Two-factor authentication</h2>
        <p className="text-sm text-gray-500 text-center">
          Enter the 6-digit code from your authenticator app.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
            Authenticator code
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            className={`w-full text-center tracking-[0.5em] text-xl font-mono border rounded-lg px-3 py-2.5 outline-none transition-colors
              ${errors.code
                ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                : 'border-gray-300 focus:border-gray-900 focus:ring-2 focus:ring-gray-100'
              }`}
            {...register('code')}
            ref={(el) => {
              // Merge react-hook-form ref with our local ref
              (register('code') as any).ref(el);
              (inputRef as any).current = el;
            }}
          />
          {errors.code && (
            <p role="alert" className="text-xs text-red-500 mt-1.5">
              {errors.code.message}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" loading={isLoading} className="w-full">
          Verify
        </Button>
      </form>

      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mx-auto mt-5"
      >
        <ArrowLeft size={15} />
        Back to sign in
      </button>
    </div>
  );
}

// ── Step 1 form ──────────────────────────────────────────────────────────────
function LoginStep({
  onTwoFactor,
  onSuccess,
}: {
  onTwoFactor: () => void;
  onSuccess: () => void;
}) {
  const isLoading = useAuthStore((s) => s.isLoading);
  const login = useAuthStore((s) => s.login);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (values: LoginValues) => {
    try {
      const result = await login(values);
      if (result.requiresTwoFactor) {
        onTwoFactor();
      } else {
        onSuccess();
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const message =
        status === 401
          ? 'Invalid email or password'
          : (err?.response?.data?.message ?? 'Something went wrong. Please try again.');
      setError('root', { message });
    }
  };

  return (
    <div className="animate-in slide-in-from-left-4 duration-300">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Welcome back</h2>
      <p className="text-sm text-gray-500 mb-6">Sign in to your account to continue</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          id="email"
          label="Email address"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          {...register('email')}
          error={errors.email?.message}
        />

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs text-gray-500 hover:text-gray-900">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            {...register('password')}
            error={errors.password?.message}
          />
        </div>

        {errors.root && (
          <p role="alert" className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {errors.root.message}
          </p>
        )}

        <Button type="submit" size="lg" loading={isLoading} className="w-full mt-2">
          Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-gray-900 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}

// ── Main login page ──────────────────────────────────────────────────────────
type Step = 'credentials' | 'totp';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clearTwoFactorPending = useAuthStore((s) => s.clearTwoFactorPending);
  const [step, setStep] = useState<Step>('credentials');

  const redirect = searchParams.get('redirect') || '/dashboard';

  const handleSuccess = () => router.push(redirect);

  const handleBack = () => {
    clearTwoFactorPending();
    setStep('credentials');
  };

  return (
    <div className="overflow-hidden">
      {step === 'credentials' ? (
        <LoginStep
          onTwoFactor={() => setStep('totp')}
          onSuccess={handleSuccess}
        />
      ) : (
        <TotpStep onBack={handleBack} onSuccess={handleSuccess} />
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
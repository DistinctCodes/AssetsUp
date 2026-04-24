'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { ToastProvider, toast } from '@/components/ui/toast';
import { useAuthStore } from '@/contrib/store/auth.store';
import { api } from '@/lib/api';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .superRefine(({ newPassword, confirmPassword }, ctx) => {
    if (newPassword !== confirmPassword) {
      ctx.addIssue({
        path: ['confirmPassword'],
        message: 'Passwords must match',
        code: 'custom',
      });
    }
  });

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: isProfileSaving },
    reset: resetProfile,
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSaving },
    reset: resetPassword,
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
  });

  useEffect(() => {
    if (user) {
      resetProfile({ firstName: user.firstName, lastName: user.lastName });
    }
  }, [user, resetProfile]);

  const onSaveProfile = async (values: ProfileValues) => {
    setProfileError('');
    try {
      const updated = await api.patch('/users/me', values).then((res) => res.data);
      setUser({ ...user, ...updated });
      toast.success('Profile updated successfully');
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to update profile';
      setProfileError(message);
    }
  };

  const onChangePassword = async (values: PasswordValues) => {
    setPasswordError('');
    try {
      await api.patch('/users/me', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      resetPassword();
      toast.success('Password changed successfully');
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to change password';
      setPasswordError(message);
    }
  };

  if (!user) {
    return <LoadingSkeleton rows={4} columns={1} />;
  }

  return (
    <div>
      <ToastProvider />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Update profile information and manage your password.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-gray-200 bg-white p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
            <p className="text-sm text-gray-500 mt-1">Update your display name and account details.</p>
          </div>

          <form onSubmit={handleProfileSubmit(onSaveProfile)} className="space-y-4">
            <Input
              label="First Name"
              {...registerProfile('firstName')}
              error={profileErrors.firstName?.message}
            />
            <Input
              label="Last Name"
              {...registerProfile('lastName')}
              error={profileErrors.lastName?.message}
            />
            <Input label="Email" value={user.email} disabled />

            {profileError ? (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {profileError}
              </p>
            ) : null}

            <Button type="submit" loading={isProfileSaving} size="lg">
              Save profile
            </Button>
          </form>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
            <p className="text-sm text-gray-500 mt-1">Update your account password to keep your account secure.</p>
          </div>

          <form onSubmit={handlePasswordSubmit(onChangePassword)} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              {...registerPassword('currentPassword')}
              error={passwordErrors.currentPassword?.message}
            />
            <Input
              label="New Password"
              type="password"
              {...registerPassword('newPassword')}
              error={passwordErrors.newPassword?.message}
            />
            <Input
              label="Confirm New Password"
              type="password"
              {...registerPassword('confirmPassword')}
              error={passwordErrors.confirmPassword?.message}
            />

            {passwordError ? (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {passwordError}
              </p>
            ) : null}

            <Button type="submit" loading={isPasswordSaving} size="lg">
              Save password
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}

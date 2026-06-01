'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Lock, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

const profileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Valid email required'),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmNewPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: "Passwords don't match",
    path: ['confirmNewPassword'],
  });
type PasswordForm = z.infer<typeof passwordSchema>;

type Tab = 'profile' | 'security';

async function patchProfile(data: Partial<ProfileForm>) {
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6003/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
  const res = await fetch(`${API}/users/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Update failed');
}

async function changePassword(data: PasswordForm) {
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6003/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
  const res = await fetch(`${API}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    }),
  });
  if (!res.ok) throw new Error('Password change failed');
}

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>('profile');
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user
        ? `${(user as { firstName?: string }).firstName ?? ''} ${(user as { lastName?: string }).lastName ?? ''}`.trim()
        : '',
      email: user?.email ?? '',
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const onProfileSubmit = async (data: ProfileForm) => {
    setProfileError('');
    try {
      await patchProfile(data);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch {
      setProfileError('Failed to save. Try again.');
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    setPasswordError('');
    try {
      await changePassword(data);
      passwordForm.reset();
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 2000);
    } catch {
      setPasswordError('Failed to change password. Check your current password.');
    }
  };

  const inputClass =
    'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900';
  const errorClass = 'text-xs text-red-500 mt-1';

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your profile and account preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {(['profile', 'security'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors ${
              tab === t
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center">
              <User size={15} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Profile</h2>
              <p className="text-xs text-gray-500">Update your account details</p>
            </div>
          </div>

          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input {...profileForm.register('fullName')} className={inputClass} />
              {profileForm.formState.errors.fullName && (
                <p className={errorClass}>{profileForm.formState.errors.fullName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                {...profileForm.register('email')}
                type="email"
                className={inputClass}
              />
              {profileForm.formState.errors.email && (
                <p className={errorClass}>{profileForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={profileForm.formState.isSubmitting}
                className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                {profileForm.formState.isSubmitting
                  ? 'Saving…'
                  : profileSaved
                    ? 'Saved'
                    : 'Save changes'}
              </button>
              {profileSaved && (
                <span className="flex items-center gap-1.5 text-xs text-green-600">
                  <CheckCircle size={13} />
                  Profile updated successfully
                </span>
              )}
              {profileError && (
                <span className="text-xs text-red-500">{profileError}</span>
              )}
            </div>
          </form>
        </div>
      )}

      {tab === 'security' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
              <Lock size={15} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Change Password</h2>
              <p className="text-xs text-gray-500">
                Choose a strong password (min. 8 characters)
              </p>
            </div>
          </div>

          <form
            onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                {...passwordForm.register('currentPassword')}
                type="password"
                placeholder="••••••••"
                className={inputClass}
              />
              {passwordForm.formState.errors.currentPassword && (
                <p className={errorClass}>
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                {...passwordForm.register('newPassword')}
                type="password"
                placeholder="••••••••"
                className={inputClass}
              />
              {passwordForm.formState.errors.newPassword && (
                <p className={errorClass}>
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                {...passwordForm.register('confirmNewPassword')}
                type="password"
                placeholder="••••••••"
                className={inputClass}
              />
              {passwordForm.formState.errors.confirmNewPassword && (
                <p className={errorClass}>
                  {passwordForm.formState.errors.confirmNewPassword.message}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={passwordForm.formState.isSubmitting}
                className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                {passwordForm.formState.isSubmitting ? 'Updating…' : 'Update password'}
              </button>
              {passwordSaved && (
                <span className="flex items-center gap-1.5 text-xs text-green-600">
                  <CheckCircle size={13} />
                  Password updated
                </span>
              )}
              {passwordError && (
                <span className="text-xs text-red-500">{passwordError}</span>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

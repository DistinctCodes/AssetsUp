// frontend/app/(dashboard)/settings/page.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Lock, CheckCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useUpdateProfile } from "@/lib/query/hooks/useUsers";

// ── Profile schema ──────────────────────────────────────────────
const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});
type ProfileForm = z.infer<typeof profileSchema>;

// ── Password schema ─────────────────────────────────────────────
const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
type PasswordForm = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useUpdateProfile();
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onProfileSubmit = (data: ProfileForm) => {
    updateProfile.mutate(data, {
      onSuccess: () => {
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 3000);
      },
    });
  };

  const onPasswordSubmit = (data: PasswordForm) => {
    updateProfile.mutate(
      { password: data.password },
      {
        onSuccess: () => {
          setPasswordSaved(true);
          passwordForm.reset();
          setTimeout(() => setPasswordSaved(false), 3000);
        },
      },
    );
  };

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your profile and account preferences
        </p>
      </div>

      {/* Profile section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center flex-shrink-0">
            <User size={15} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Profile</h2>
            <p className="text-xs text-gray-500">Update your display name</p>
          </div>
        </div>

        <form
          onSubmit={profileForm.handleSubmit(onProfileSubmit)}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                First name
              </label>
              <input
                {...profileForm.register("firstName")}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              {profileForm.formState.errors.firstName && (
                <p className="text-xs text-red-500 mt-1">
                  {profileForm.formState.errors.firstName.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Last name
              </label>
              <input
                {...profileForm.register("lastName")}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              {profileForm.formState.errors.lastName && (
                <p className="text-xs text-red-500 mt-1">
                  {profileForm.formState.errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              type="email"
              value={user?.email ?? ""}
              disabled
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">
              Email cannot be changed.
            </p>
          </div>

          {/* Role (read-only) */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Role
            </label>
            <input
              value={
                user?.role
                  ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                  : ""
              }
              disabled
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={updateProfile.isPending}
              className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {updateProfile.isPending ? "Saving…" : "Save changes"}
            </button>
            {profileSaved && (
              <span className="flex items-center gap-1.5 text-xs text-green-600">
                <CheckCircle size={13} />
                Saved successfully
              </span>
            )}
            {updateProfile.isError && (
              <span className="text-xs text-red-500">
                Failed to save. Try again.
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Password section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center flex-shrink-0">
            <Lock size={15} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Change Password
            </h2>
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
              New password
            </label>
            <input
              {...passwordForm.register("password")}
              type="password"
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            {passwordForm.formState.errors.password && (
              <p className="text-xs text-red-500 mt-1">
                {passwordForm.formState.errors.password.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Confirm new password
            </label>
            <input
              {...passwordForm.register("confirmPassword")}
              type="password"
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            {passwordForm.formState.errors.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">
                {passwordForm.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={updateProfile.isPending}
              className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {updateProfile.isPending ? "Updating…" : "Update password"}
            </button>
            {passwordSaved && (
              <span className="flex items-center gap-1.5 text-xs text-green-600">
                <CheckCircle size={13} />
                Password updated
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

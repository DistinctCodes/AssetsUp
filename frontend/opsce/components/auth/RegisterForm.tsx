"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner"; // or your toast library
import { useRegisterMutation } from "@/lib/query/mutations/auth";


// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name must be under 100 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

// ---------------------------------------------------------------------------
// Password strength helpers
// ---------------------------------------------------------------------------
type StrengthLevel = "weak" | "medium" | "strong";

function getPasswordStrength(password: string): StrengthLevel {
  if (!password) return "weak";
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return "weak";
  if (score <= 3) return "medium";
  return "strong";
}

const strengthConfig: Record<StrengthLevel, { label: string; color: string; width: string }> = {
  weak:   { label: "Weak",   color: "bg-red-500",    width: "w-1/3" },
  medium: { label: "Medium", color: "bg-yellow-400",  width: "w-2/3" },
  strong: { label: "Strong", color: "bg-emerald-500", width: "w-full" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function RegisterForm() {
  const router = useRouter();
  const { mutateAsync: register, isPending } = useRegisterMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register: field,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
  });

  const passwordValue = watch("password", "");
  const strength = getPasswordStrength(passwordValue);
  const strengthInfo = strengthConfig[strength];

  const onSubmit = async (values: RegisterFormValues) => {
    try {
        await register({
            firstName: values.fullName.split(" ")[0],
            lastName: values.fullName.split(" ").slice(1).join(" ") || "",
            email: values.email,
            password: values.password,
          });
      toast.success("Account created. Please log in.");
      router.push("/login");
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        setError("email", {
          type: "manual",
          message: "An account with this email already exists",
        });
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-5 w-full max-w-md"
    >
      {/* Full Name */}
      <div className="space-y-1">
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
          Full Name
        </label>
        <input
          id="fullName"
          type="text"
          autoComplete="name"
          placeholder="Jane Doe"
          {...field("fullName")}
          aria-invalid={!!errors.fullName}
          aria-describedby={errors.fullName ? "fullName-error" : undefined}
          className={`w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm outline-none transition
            focus:ring-2 focus:ring-indigo-500
            ${errors.fullName
              ? "border-red-400 bg-red-50 focus:ring-red-400"
              : "border-gray-300 bg-white"
            }`}
        />
        {errors.fullName && (
          <p id="fullName-error" role="alert" className="text-xs text-red-600 mt-0.5">
            {errors.fullName.message}
          </p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="jane@example.com"
          {...field("email")}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          className={`w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm outline-none transition
            focus:ring-2 focus:ring-indigo-500
            ${errors.email
              ? "border-red-400 bg-red-50 focus:ring-red-400"
              : "border-gray-300 bg-white"
            }`}
        />
        {errors.email && (
          <p id="email-error" role="alert" className="text-xs text-red-600 mt-0.5">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Min. 8 chars, 1 uppercase, 1 number"
            {...field("password")}
            aria-invalid={!!errors.password}
            aria-describedby={`password-strength${errors.password ? " password-error" : ""}`}
            className={`w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm shadow-sm outline-none transition
              focus:ring-2 focus:ring-indigo-500
              ${errors.password
                ? "border-red-400 bg-red-50 focus:ring-red-400"
                : "border-gray-300 bg-white"
              }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            {showPassword ? (
              <EyeOffIcon className="h-4 w-4" />
            ) : (
              <EyeIcon className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Password strength bar */}
        {passwordValue && (
          <div id="password-strength" aria-live="polite" className="space-y-1 pt-1">
            <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${strengthInfo.color} ${strengthInfo.width}`}
              />
            </div>
            <p className={`text-xs font-medium ${
              strength === "weak" ? "text-red-500" :
              strength === "medium" ? "text-yellow-600" : "text-emerald-600"
            }`}>
              {strengthInfo.label} password
            </p>
          </div>
        )}

        {errors.password && (
          <p id="password-error" role="alert" className="text-xs text-red-600 mt-0.5">
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Confirm Password */}
      <div className="space-y-1">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          Confirm Password
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Re-enter your password"
            {...field("confirmPassword")}
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
            className={`w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm shadow-sm outline-none transition
              focus:ring-2 focus:ring-indigo-500
              ${errors.confirmPassword
                ? "border-red-400 bg-red-50 focus:ring-red-400"
                : "border-gray-300 bg-white"
              }`}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
            className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            {showConfirm ? (
              <EyeOffIcon className="h-4 w-4" />
            ) : (
              <EyeIcon className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <p id="confirmPassword-error" role="alert" className="text-xs text-red-600 mt-0.5">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        aria-busy={isPending}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow
          hover:bg-indigo-700 active:scale-[0.98] transition
          disabled:opacity-60 disabled:cursor-not-allowed
          flex items-center justify-center gap-2"
      >
        {isPending && (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        )}
        {isPending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Inline icon helpers (avoids extra deps; swap for lucide-react if available)
// ---------------------------------------------------------------------------
function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.965 9.965 0 012.212-3.592M9.88 9.88A3 3 0 0114.12 14.12M3 3l18 18" />
    </svg>
  );
}
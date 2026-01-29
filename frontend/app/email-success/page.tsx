"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type VerificationState = "loading" | "success" | "error" | "already-verified";

export default function VerifyEmailPage() {
  const [state, setState] = useState<VerificationState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [countdown, setCountdown] = useState(5);
  const [isResending, setIsResending] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setState("error");
      setErrorMessage(
        "No verification token found. Please check your email link.",
      );
      return;
    }

    verifyEmail(token);
  }, [token]);

  useEffect(() => {
    if (state === "success" || state === "already-verified") {
      let timeLeft = 5;
      const timer = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft);
        if (timeLeft === 0) {
          clearInterval(timer);
          // Check if user is logged in to decide redirect
          const isLoggedIn = localStorage.getItem("authToken"); // Adjust based on your auth
          router.push(isLoggedIn ? "/dashboard" : "/login");
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [state, router]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await fetch("/api/v1/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: verificationToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.message?.includes("already verified")) {
          setState("already-verified");
          setUserEmail(data.email || "");
        } else if (
          data.message?.includes("expired") ||
          data.message?.includes("invalid")
        ) {
          setState("error");
          setErrorMessage(
            "This verification link has expired or is invalid. Please request a new one.",
          );
        } else {
          setState("error");
          setErrorMessage(
            data.message || "Verification failed. Please try again.",
          );
        }
        return;
      }

      setState("success");
      setUserEmail(data.email || "");
    } catch (error) {
      setState("error");
      setErrorMessage(
        "Network error. Please check your connection and try again.",
      );
    }
  };

  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      const response = await fetch("/api/v1/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: userEmail }),
      });

      if (response.ok) {
        alert("Verification email sent! Please check your inbox.");
      } else {
        alert("Failed to resend email. Please try again later.");
      }
    } catch (error) {
      alert("Network error. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  // Loading State
  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-4">
            <svg
              className="animate-spin h-10 w-10 text-emerald-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Verifying Your Email...
          </h2>
          <p className="mt-2 text-sm text-gray-600">Please wait a moment</p>
        </div>
      </div>
    );
  }

  // Success State
  if (state === "success") {
    const isLoggedIn =
      typeof window !== "undefined" && localStorage.getItem("authToken");

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 animate-fade-in">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4 animate-scale-in">
              <svg
                className="h-10 w-10 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              Email Verified!
            </h2>
            <p className="mt-4 text-base text-gray-600">
              Your email has been successfully verified
            </p>
            {userEmail && (
              <p className="mt-2 text-sm font-medium text-emerald-600">
                {userEmail}
              </p>
            )}
            <p className="mt-6 text-sm text-gray-500">
              You can now access all features of AssetsUp
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href={isLoggedIn ? "/dashboard" : "/login"}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
            >
              {isLoggedIn ? "Continue to Dashboard" : "Go to Login"}
            </Link>
            <p className="text-center text-sm text-gray-500">
              Redirecting in {countdown} seconds...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Already Verified State
  if (state === "already-verified") {
    const isLoggedIn =
      typeof window !== "undefined" && localStorage.getItem("authToken");

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
              <svg
                className="h-10 w-10 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              Already Verified
            </h2>
            <p className="mt-4 text-base text-gray-600">
              This email is already verified
            </p>
            {userEmail && (
              <p className="mt-2 text-sm font-medium text-blue-600">
                {userEmail}
              </p>
            )}
            <p className="mt-6 text-sm text-gray-500">
              You can proceed to login or dashboard
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href={isLoggedIn ? "/dashboard" : "/login"}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
            >
              {isLoggedIn ? "Go to Dashboard" : "Go to Login"}
            </Link>
            <p className="text-center text-sm text-gray-500">
              Redirecting in {countdown} seconds...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <svg
              className="h-10 w-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Verification Failed
          </h2>
          <p className="mt-4 text-base text-gray-600">{errorMessage}</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleResendEmail}
            disabled={isResending || !userEmail}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isResending ? (
              <div className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Sending...
              </div>
            ) : (
              "Resend Verification Email"
            )}
          </button>
          <Link
            href="/login"
            className="block w-full text-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

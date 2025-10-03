"use client";

import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="h-screen max-w-2xl mx-auto p-4 flex flex-col items-center justify-center">
        <div className="flex items-center justify-center mb-6">
          <h1 className="text-4xl text-white mr-2">500 |</h1>
          <p className="text-lg text-white">Internal Server Error</p>
        </div>

        <p className="text-sm text-white">
          We&apos;re having trouble right now. Please refresh the page or try again
          later.
        </p>
        <div className="flex lg:flex-row flex-col max-w-md my-4 gap-4">
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}

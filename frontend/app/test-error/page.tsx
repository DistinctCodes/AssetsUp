"use client";

import { useState } from "react";

export default function TestErrorPage() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error("This is a test error to demonstrate the error page!");
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Error Page Test</h1>
        <p className="text-lg mb-6">
          Click the button below to trigger an error and test the error page:
        </p>
        <button
          onClick={() => setShouldThrow(true)}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200"
        >
          Trigger Error
        </button>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';

export function AuthInitializer() {
  const loadUser = useAuthStore((s) => s.loadUser);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadUser().finally(() => {
      if (mounted) setInitialized(true);
    });
    return () => {
      mounted = false;
    };
  }, [loadUser]);

  if (!initialized || isLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-white p-6 dark:bg-gray-950" aria-label="Loading">
        <div className="mx-auto max-w-6xl animate-pulse space-y-6">
          <div className="h-10 w-48 rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-32 rounded-lg bg-gray-100 dark:bg-gray-900" />
          <div className="h-64 rounded-lg bg-gray-100 dark:bg-gray-900" />
        </div>
      </div>
    );
  }

  return null;
}

'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';

export function AuthInitializer() {
  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  return null;
}

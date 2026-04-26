'use client';

import { useCallback } from 'react';

export interface ToastFunctions {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

export function useToast(): ToastFunctions {
  const success = useCallback((message: string) => {
    const toast = (window as any).__toast;
    if (toast) {
      toast.success(message);
    }
  }, []);

  const error = useCallback((message: string) => {
    const toast = (window as any).__toast;
    if (toast) {
      toast.error(message);
    }
  }, []);

  const info = useCallback((message: string) => {
    const toast = (window as any).__toast;
    if (toast) {
      toast.info(message);
    }
  }, []);

  return { success, error, info };
}

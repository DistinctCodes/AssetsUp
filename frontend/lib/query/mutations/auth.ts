import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import type { LoginPayload, RegisterPayload } from '@/lib/auth-api';

// ---------------------------------------------------------------------------
// Shared error type
// ---------------------------------------------------------------------------

export interface ApiError {
  response?: {
    status: number;
    data?: { message?: string };
  };
  message: string;
}

// ---------------------------------------------------------------------------
// useLoginMutation
// Delegates to store.login() so localStorage, cookie, and Zustand state
// are all updated in one place — exactly as the store already does.
// ---------------------------------------------------------------------------

export function useLoginMutation(
  options?: UseMutationOptions<void, ApiError, LoginPayload>,
) {
  const login = useAuthStore((s) => s.login);

  return useMutation<void, ApiError, LoginPayload>({
    mutationFn: (payload) => login(payload),
    ...options,
  });
}

// ---------------------------------------------------------------------------
// useRegisterMutation
// ---------------------------------------------------------------------------

export function useRegisterMutation(
  options?: UseMutationOptions<void, ApiError, RegisterPayload>,
) {
  const register = useAuthStore((s) => s.register);

  return useMutation<void, ApiError, RegisterPayload>({
    mutationFn: (payload) => register(payload),
    ...options,
  });
}

// ---------------------------------------------------------------------------
// useLogoutMutation
// ---------------------------------------------------------------------------

export function useLogoutMutation(
  options?: UseMutationOptions<void, ApiError, void>,
) {
  const logout = useAuthStore((s) => s.logout);

  return useMutation<void, ApiError, void>({
    mutationFn: () => logout(),
    ...options,
  });
}


import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { queryKeys } from '../keys';
import {
  RegisterInput,
  LoginInput,
  AuthResponse,
  ApiError,
} from '../types';

/**
 * Mutation hook for user registration
 * @param options - Optional mutation options for callbacks and config
 * @returns Mutation object with mutate, isPending, isError, etc.
 */
export function useRegisterMutation(
  options?: UseMutationOptions<AuthResponse, ApiError, RegisterInput>
) {
  return useMutation<AuthResponse, ApiError, RegisterInput>({
    mutationKey: queryKeys.auth.register,
    mutationFn: (data: RegisterInput) => apiClient.register(data),
    ...options,
  });
}

/**
 * Mutation hook for user login
 * @param options - Optional mutation options for callbacks and config
 * @returns Mutation object with mutate, isPending, isError, etc.
 */
export function useLoginMutation(
  options?: UseMutationOptions<AuthResponse, ApiError, LoginInput>
) {
  return useMutation<AuthResponse, ApiError, LoginInput>({
    mutationKey: queryKeys.auth.login,
    mutationFn: (data: LoginInput) => apiClient.login(data),
    ...options,
  });
}
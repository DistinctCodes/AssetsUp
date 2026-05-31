import { apiClient } from '@/lib/api/client';
import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { ApiError } from 'next/dist/server/api-utils';

interface ForgotPasswordDto { email: string }
interface ForgotPasswordResponse { message: string }

export function useForgotPasswordMutation(
  options?: UseMutationOptions<ForgotPasswordResponse, ApiError, ForgotPasswordDto>,
) {
  return useMutation<ForgotPasswordResponse, ApiError, ForgotPasswordDto>({
    mutationFn: (data) =>
      apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', data).then((r) => r.data),
    ...options,
  });
}
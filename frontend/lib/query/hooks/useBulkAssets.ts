import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface BulkStatusPayload {
  ids: string[];
  status: string;
}

export interface BulkAssignPayload {
  ids: string[];
  userId?: string;
  departmentId?: string;
}

export interface BulkDeletePayload {
  ids: string[];
}

export interface BulkActionResponse {
  succeeded: string[];
  failed: { id: string; reason: string }[];
  skipped: string[];
}

export function useBulkUpdateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BulkStatusPayload): Promise<BulkActionResponse> => {
      const response = await api.patch('/assets/bulk/status', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

export function useBulkAssign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BulkAssignPayload): Promise<BulkActionResponse> => {
      const response = await api.patch('/assets/bulk/assign', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

export function useBulkDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BulkDeletePayload): Promise<BulkActionResponse> => {
      const response = await api.delete('/assets/bulk', { data: payload });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

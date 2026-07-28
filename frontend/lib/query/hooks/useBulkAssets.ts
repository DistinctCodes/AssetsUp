import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface BulkStatusPayload {
  assetIds: string[];
  status: string;
}

export interface BulkAssignPayload {
  assetIds: string[];
  assignedToId?: string;
  departmentId?: string;
}

export interface BulkDeletePayload {
  assetIds: string[];
}

export interface BulkActionResponse {
  updatedCount: number;
  skippedCount: number;
  message?: string;
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
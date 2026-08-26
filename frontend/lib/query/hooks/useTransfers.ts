import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query';
import {
  transferApiClient,
  TransferListFilters,
  TransferListResponse,
  AssetTransfer,
  RejectTransferInput,
} from '@/lib/api/transfers';
import { queryKeys } from '../keys';
import { ApiError } from '../types';

export function useTransfers(
  filters?: TransferListFilters,
  options?: Omit<
    UseQueryOptions<TransferListResponse, ApiError>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<TransferListResponse, ApiError>({
    queryKey: queryKeys.transfers.list((filters as Record<string, unknown>) ?? {}),
    queryFn: () => transferApiClient.getTransfers(filters),
    ...options,
  });
}

export function useTransfer(id: string) {
  return useQuery<AssetTransfer, ApiError>({
    queryKey: queryKeys.transfers.detail(id),
    queryFn: () => transferApiClient.getTransfer(id),
  });
}

export function useApproveTransfer() {
  const queryClient = useQueryClient();
  return useMutation<AssetTransfer, ApiError, string>({
    mutationFn: (id) => transferApiClient.approveTransfer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
    },
  });
}

export function useRejectTransfer() {
  const queryClient = useQueryClient();
  return useMutation<AssetTransfer, ApiError, { id: string; data: RejectTransferInput }>({
    mutationFn: ({ id, data }) => transferApiClient.rejectTransfer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
    },
  });
}

export function useCancelTransfer() {
  const queryClient = useQueryClient();
  return useMutation<AssetTransfer, ApiError, string>({
    mutationFn: (id) => transferApiClient.cancelTransfer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
    },
  });
}

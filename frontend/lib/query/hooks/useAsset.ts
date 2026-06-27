import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";
import { assetApiClient } from "@/lib/api/assets";
import { queryKeys } from "../keys";
import {
  Asset,
  AssetHistoryEvent,
  AssetDocument,
  MaintenanceRecord,
  AssetNote,
  UpdateAssetStatusInput,
  TransferAssetInput,
  CreateMaintenanceInput,
  CreateNoteInput,
  AssetHistoryFilters,
  Department,
  AssetUser,
  TokenHolder,
  TokenSummary,
  TransferTokensInput,
  TokenLockStatus,
  DisposalRequest,
  CreateDisposalInput,
} from "../types/asset";
import { ApiError } from "../types";

// Queries
export function useAsset(
  id: string,
  options?: Omit<UseQueryOptions<Asset, ApiError>, "queryKey" | "queryFn">,
) {
  return useQuery<Asset, ApiError>({
    queryKey: queryKeys.assets.detail(id),
    queryFn: () => assetApiClient.getAsset(id),
    enabled: !!id,
    ...options,
  });
}

export function useAssetHistory(
  id: string,
  filters?: AssetHistoryFilters,
  options?: Omit<
    UseQueryOptions<AssetHistoryEvent[], ApiError>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<AssetHistoryEvent[], ApiError>({
    queryKey: queryKeys.assets.history(
      id,
      filters as Record<string, unknown> | undefined,
    ),
    queryFn: () => assetApiClient.getAssetHistory(id, filters),
    enabled: !!id,
    ...options,
  });
}

export function useAssetDocuments(
  id: string,
  options?: Omit<
    UseQueryOptions<AssetDocument[], ApiError>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<AssetDocument[], ApiError>({
    queryKey: queryKeys.assets.documents(id),
    queryFn: () => assetApiClient.getAssetDocuments(id),
    enabled: !!id,
    ...options,
  });
}

export function useMaintenanceRecords(
  id: string,
  options?: Omit<
    UseQueryOptions<MaintenanceRecord[], ApiError>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<MaintenanceRecord[], ApiError>({
    queryKey: queryKeys.assets.maintenance(id),
    queryFn: () => assetApiClient.getMaintenanceRecords(id),
    enabled: !!id,
    ...options,
  });
}

export function useAssetNotes(
  id: string,
  options?: Omit<
    UseQueryOptions<AssetNote[], ApiError>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<AssetNote[], ApiError>({
    queryKey: queryKeys.assets.notes(id),
    queryFn: () => assetApiClient.getAssetNotes(id),
    enabled: !!id,
    ...options,
  });
}

export function useDepartments(
  options?: Omit<
    UseQueryOptions<Department[], ApiError>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<Department[], ApiError>({
    queryKey: queryKeys.departments.list(),
    queryFn: () => assetApiClient.getDepartments(),
    ...options,
  });
}

export function useUsers(
  options?: Omit<
    UseQueryOptions<AssetUser[], ApiError>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<AssetUser[], ApiError>({
    queryKey: queryKeys.users.list(),
    queryFn: () => assetApiClient.getUsers(),
    ...options,
  });
}

// Mutations
export function useUpdateAssetStatus(
  id: string,
  options?: UseMutationOptions<Asset, ApiError, UpdateAssetStatusInput>,
) {
  const queryClient = useQueryClient();

  return useMutation<Asset, ApiError, UpdateAssetStatusInput>({
    mutationFn: (data) => assetApiClient.updateAssetStatus(id, data),
    onSuccess: (updatedAsset) => {
      queryClient.setQueryData(queryKeys.assets.detail(id), updatedAsset);
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.history(id) });
    },
    ...options,
  });
}

export function useTransferAsset(
  id: string,
  options?: UseMutationOptions<Asset, ApiError, TransferAssetInput>,
) {
  const queryClient = useQueryClient();

  return useMutation<Asset, ApiError, TransferAssetInput>({
    mutationFn: (data) => assetApiClient.transferAsset(id, data),
    onSuccess: (updatedAsset) => {
      queryClient.setQueryData(queryKeys.assets.detail(id), updatedAsset);
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.history(id) });
    },
    ...options,
  });
}

export function useDeleteAsset(
  id: string,
  options?: UseMutationOptions<void, ApiError, void>,
) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, void>({
    mutationFn: () => assetApiClient.deleteAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all });
    },
    ...options,
  });
}

export function useUploadDocument(
  assetId: string,
  options?: UseMutationOptions<
    AssetDocument,
    ApiError,
    { file: File; name?: string }
  >,
) {
  const queryClient = useQueryClient();

  return useMutation<AssetDocument, ApiError, { file: File; name?: string }>({
    mutationFn: ({ file, name }) =>
      assetApiClient.uploadDocument(assetId, file, name),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assets.documents(assetId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.assets.history(assetId),
      });
    },
    ...options,
  });
}

export function useDeleteDocument(
  assetId: string,
  options?: UseMutationOptions<void, ApiError, string>,
) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (documentId) =>
      assetApiClient.deleteDocument(assetId, documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assets.documents(assetId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.assets.history(assetId),
      });
    },
    ...options,
  });
}

export function useCreateMaintenanceRecord(
  assetId: string,
  options?: UseMutationOptions<
    MaintenanceRecord,
    ApiError,
    CreateMaintenanceInput
  >,
) {
  const queryClient = useQueryClient();

  return useMutation<MaintenanceRecord, ApiError, CreateMaintenanceInput>({
    mutationFn: (data) => assetApiClient.createMaintenanceRecord(assetId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assets.maintenance(assetId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.assets.history(assetId),
      });
    },
    ...options,
  });
}

export function useCreateNote(
  assetId: string,
  options?: UseMutationOptions<AssetNote, ApiError, CreateNoteInput>,
) {
  const queryClient = useQueryClient();

  return useMutation<AssetNote, ApiError, CreateNoteInput>({
    mutationFn: (data) => assetApiClient.createNote(assetId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assets.notes(assetId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.assets.history(assetId),
      });
    },
    ...options,
  });
}

export function useDeleteNote(
  assetId: string,
  options?: UseMutationOptions<void, ApiError, string>,
) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (noteId) => assetApiClient.deleteNote(assetId, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assets.notes(assetId),
      });
    },
    ...options,
  });
}

export function useUpdateMaintenanceStatus(
  assetId: string,
  options?: UseMutationOptions<
    MaintenanceRecord,
    ApiError,
    { maintenanceId: string; status: string }
  >,
) {
  const queryClient = useQueryClient();

  return useMutation<
    MaintenanceRecord,
    ApiError,
    { maintenanceId: string; status: string }
  >({
    mutationFn: ({ maintenanceId, status }) =>
      assetApiClient.updateMaintenanceStatus(assetId, maintenanceId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assets.maintenance(assetId),
      });
    },
    ...options,
  });
}

// Token-related queries and mutations
export function useTokenHolders(
  assetId: string,
  options?: Omit<
    UseQueryOptions<TokenHolder[], ApiError>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<TokenHolder[], ApiError>({
    queryKey: ["tokenHolders", assetId],
    queryFn: () => assetApiClient.getTokenHolders(assetId),
    enabled: !!assetId,
    ...options,
  });
}

export function useTokenSummary(
  assetId: string,
  options?: Omit<
    UseQueryOptions<TokenSummary, ApiError>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<TokenSummary, ApiError>({
    queryKey: ["tokenSummary", assetId],
    queryFn: () => assetApiClient.getTokenSummary(assetId),
    enabled: !!assetId,
    ...options,
  });
}

export function useTokenLockStatus(
  assetId: string,
  options?: Omit<
    UseQueryOptions<TokenLockStatus, ApiError>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<TokenLockStatus, ApiError>({
    queryKey: ["tokenLockStatus", assetId],
    queryFn: () => assetApiClient.getTokenLockStatus(assetId),
    enabled: !!assetId,
    ...options,
  });
}

export function useTransferTokens(
  assetId: string,
  options?: UseMutationOptions<void, ApiError, TransferTokensInput>,
) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, TransferTokensInput>({
    mutationFn: (data) => assetApiClient.transferTokens(assetId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tokenHolders", assetId] });
      queryClient.invalidateQueries({ queryKey: ["tokenSummary", assetId] });
    },
    ...options,
  });
}

export function useLockTokens(
  assetId: string,
  options?: UseMutationOptions<TokenLockStatus, ApiError, void>,
) {
  const queryClient = useQueryClient();

  return useMutation<TokenLockStatus, ApiError, void>({
    mutationFn: () => assetApiClient.lockTokens(assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tokenLockStatus", assetId] });
    },
    ...options,
  });
}

export function useUnlockTokens(
  assetId: string,
  options?: UseMutationOptions<TokenLockStatus, ApiError, void>,
) {
  const queryClient = useQueryClient();

  return useMutation<TokenLockStatus, ApiError, void>({
    mutationFn: () => assetApiClient.unlockTokens(assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tokenLockStatus", assetId] });
    },
    ...options,
  });
}

// ── Asset Disposal ───────────────────────────────────────────

export function useCreateDisposalRequest(
  assetId: string,
  options?: { onSuccess?: () => void },
) {
  const queryClient = useQueryClient();
  return useMutation<DisposalRequest, ApiError, CreateDisposalInput>({
    mutationFn: (data) => assetApiClient.createDisposalRequest(assetId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assets.detail(assetId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.disposals.pending(),
      });
      options?.onSuccess?.();
    },
    ...options,
  });
}

export function useApproveDisposal(
  assetId: string,
  disposalId: string,
  options?: { onSuccess?: () => void },
) {
  const queryClient = useQueryClient();
  return useMutation<DisposalRequest, ApiError, void>({
    mutationFn: () => assetApiClient.approveDisposal(assetId, disposalId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assets.detail(assetId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.disposals.pending(),
      });
      options?.onSuccess?.();
    },
    ...options,
  });
}

export function useRejectDisposal(
  assetId: string,
  disposalId: string,
  options?: { onSuccess?: () => void },
) {
  const queryClient = useQueryClient();
  return useMutation<DisposalRequest, ApiError, { reason: string }>({
    mutationFn: ({ reason }) =>
      assetApiClient.rejectDisposal(assetId, disposalId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assets.detail(assetId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.disposals.pending(),
      });
      options?.onSuccess?.();
    },
    ...options,
  });
}

export function usePendingDisposals() {
  return useQuery<DisposalRequest[], ApiError>({
    queryKey: queryKeys.disposals.pending(),
    queryFn: () => assetApiClient.getPendingDisposals(),
  });
}

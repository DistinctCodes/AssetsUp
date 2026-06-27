// frontend/lib/query/hooks/useAssets.ts
import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import {
  assetApiClient,
  AssetListFilters,
  AssetListResponse,
  CreateAssetInput,
  DepartmentWithCount,
  CategoryWithCount,
} from "@/lib/api/assets";
import { queryKeys } from "../keys";
import {
  Asset,
  AssetUser,
  UpdateAssetStatusInput,
  TransferAssetInput,
  UpdateAssetInput,
  DisposalRequest,
  CreateDisposalInput,
} from "../types/asset";
import { ApiError, Category } from "../types";
import { api } from "@/lib/api";

export function useAssets(
  filters?: AssetListFilters,
  options?: Omit<
    UseQueryOptions<AssetListResponse, ApiError>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<AssetListResponse, ApiError>({
    queryKey: queryKeys.assets.list((filters as Record<string, unknown>) ?? {}),
    queryFn: () => assetApiClient.getAssets(filters),
    ...options,
  });
}

// ── Departments ──────────────────────────────────────────────

export function useDepartmentsList() {
  return useQuery<DepartmentWithCount[], ApiError>({
    queryKey: queryKeys.departments.list(),
    queryFn: () => assetApiClient.getDepartments(),
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation<
    { id: string; name: string },
    ApiError,
    { name: string; description?: string }
  >({
    mutationFn: (data) => assetApiClient.createDepartment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.all });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => assetApiClient.deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.all });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation<
    { id: string; name: string },
    ApiError,
    { id: string; data: { name: string; description?: string } }
  >({
    mutationFn: ({ id, data }) => assetApiClient.updateDepartment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.all });
    },
  });
}

// ── Categories ───────────────────────────────────────────────

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () =>
      api.get<CategoryWithCount[]>("/categories").then((r) => r.data),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation<
    { id: string; name: string },
    ApiError,
    { name: string; description?: string }
  >({
    mutationFn: (data) => assetApiClient.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => assetApiClient.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation<
    { id: string; name: string },
    ApiError,
    { id: string; data: { name: string; description?: string } }
  >({
    mutationFn: ({ id, data }) => assetApiClient.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

// ── Assets ───────────────────────────────────────────────────

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation<Asset, ApiError, CreateAssetInput>({
    mutationFn: (data) => assetApiClient.createAsset(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all });
    },
  });
}

export function useUpdateAsset(
  assetId: string,
  options?: { onSuccess?: () => void },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateAssetInput) =>
      api.patch<Asset>(`/assets/${assetId}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["asset", assetId] });
      options?.onSuccess?.();
    },
  });
}

export function useUpdateAssetStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation<Asset, ApiError, UpdateAssetStatusInput>({
    mutationFn: (data) => assetApiClient.updateAssetStatus(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.assets.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all });
    },
  });
}

export function useTransferAsset(id: string) {
  const queryClient = useQueryClient();
  return useMutation<Asset, ApiError, TransferAssetInput>({
    mutationFn: (data) => assetApiClient.transferAsset(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.assets.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all });
    },
  });
}

// ── Users ───────────────────────────────────────────────────

export function useUsers() {
  return useQuery<AssetUser[], ApiError>({
    queryKey: ["users"], // Wait, let's see if queryKeys has users
    queryFn: () => assetApiClient.getUsers(),
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
  });
}

export function usePendingDisposals() {
  return useQuery<DisposalRequest[], ApiError>({
    queryKey: queryKeys.disposals.pending(),
    queryFn: () => assetApiClient.getPendingDisposals(),
  });
}

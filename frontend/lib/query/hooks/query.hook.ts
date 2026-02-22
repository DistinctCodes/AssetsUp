// frontend/lib/query/hooks/useAssets.ts
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import {
assetApiClient,
AssetListFilters,
AssetListResponse,
CreateAssetInput,
DepartmentWithCount,
CategoryWithCount,
} from '@/lib/api/assets';
import { queryKeys } from '../keys';
import { Asset } from '../types/asset';
import { ApiError } from '../types';

export function useAssets(
filters?: AssetListFilters,
options?: Omit<UseQueryOptions<AssetListResponse, ApiError>, 'queryKey' | 'queryFn'>,
) {
return useQuery<AssetListResponse, ApiError>({
queryKey: queryKeys.assets.list(filters as Record<string, unknown> ?? {}),
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
return useMutation<{ id: string; name: string }, ApiError, { name: string; description?: string }>({
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

// ── Categories ───────────────────────────────────────────────

export function useCategories() {
return useQuery<CategoryWithCount[], ApiError>({
queryKey: queryKeys.categories.list(),
queryFn: () => assetApiClient.getCategories(),
});
}

export function useCreateCategory() {
const queryClient = useQueryClient();
return useMutation<{ id: string; name: string }, ApiError, { name: string; description?: string }>({
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

export function useUpdateAsset(id: string) {
const queryClient = useQueryClient();
return useMutation<Asset, ApiError, Partial<CreateAssetInput>>({
mutationFn: (data) => assetApiClient.updateAsset(id, data),
onSuccess: (updated) => {
queryClient.setQueryData(queryKeys.assets.detail(id), updated);
queryClient.invalidateQueries({ queryKey: queryKeys.assets.all });
},
});
}

---

// frontend/lib/query/hooks/useReports.ts
import { useQuery } from '@tanstack/react-query';
import { reportsApiClient, ReportsSummary } from '@/lib/api/reports';

export function useReportsSummary() {
return useQuery<ReportsSummary>({
queryKey: ['reports', 'summary'],
queryFn: () => reportsApiClient.getSummary(),
});
}

---

// frontend/lib/query/hooks/useUser.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
usersApiClient,
AppUser,
UserRole,
UpdateProfileInput,
} from "@/lib/api/users";

const usersKeys = {
all: ["users"] as const,
list: (search?: string) => [...usersKeys.all, "list", search ?? ""] as const,
};

export function useUsersList(search?: string) {
return useQuery<AppUser[]>({
queryKey: usersKeys.list(search),
queryFn: () => usersApiClient.getUsers(search),
});
}

export function useUpdateUserRole() {
const queryClient = useQueryClient();
return useMutation<AppUser, Error, { id: string; role: UserRole }>({
mutationFn: ({ id, role }) => usersApiClient.updateRole(id, role),
onSuccess: () => {
queryClient.invalidateQueries({ queryKey: usersKeys.all });
},
});
}

export function useUpdateProfile() {
const queryClient = useQueryClient();
return useMutation<AppUser, Error, UpdateProfileInput>({
mutationFn: (data) => usersApiClient.updateProfile(data),
onSuccess: () => {
queryClient.invalidateQueries({ queryKey: usersKeys.all });
},
});
}

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import type { Asset, AssetListResponse, Department, Category, AppUser, ReportsSummary } from './types';
import { api } from '@/lib/api';

export function useAssets() {
  return useQuery<AssetListResponse>({
    queryKey: queryKeys.assets.all(),
    queryFn: () => api.get<AssetListResponse>('/assets').then((r) => r.data),
  });
}

export function useDepartments() {
  return useQuery<Department[]>({
    queryKey: queryKeys.departments.all(),
    queryFn: () => api.get<Department[]>('/departments').then((r) => r.data),
  });
}

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: queryKeys.categories.all(),
    queryFn: () => api.get<Category[]>('/categories').then((r) => r.data),
  });
}

export function useUsers() {
  return useQuery<AppUser[]>({
    queryKey: queryKeys.users.all(),
    queryFn: () => api.get<AppUser[]>('/users').then((r) => r.data),
  });
}

export function useReportsSummary() {
  return useQuery<ReportsSummary>({
    queryKey: queryKeys.reports.summary(),
    queryFn: () => api.get<ReportsSummary>('/reports/summary').then((r) => r.data),
  });
}

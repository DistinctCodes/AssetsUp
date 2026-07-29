import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  maintenanceApiClient,
  CreateMaintenanceRecordInput,
  MaintenanceFilters,
  MaintenanceRecord,
  MaintenanceStatus,
} from '@/lib/api/maintenance';
import { queryKeys } from '../keys';

export function useMaintenanceRecords(filters?: MaintenanceFilters) {
  return useQuery<MaintenanceRecord[]>({
    queryKey: queryKeys.maintenance.list(filters as Record<string, unknown>),
    queryFn: () => maintenanceApiClient.getMaintenanceRecords(filters),
  });
}

export function useCreateMaintenanceRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMaintenanceRecordInput) =>
      maintenanceApiClient.createMaintenanceRecord(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.all });
    },
  });
}

export function useUpdateMaintenanceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: MaintenanceStatus }) =>
      maintenanceApiClient.updateMaintenanceStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.maintenance.all });
      const previous = queryClient.getQueriesData<MaintenanceRecord[]>({
        queryKey: queryKeys.maintenance.all,
      });
      previous.forEach(([key, records]) => {
        if (!records) return;
        queryClient.setQueryData<MaintenanceRecord[]>(
          key,
          records.map((r) => (r.id === id ? { ...r, status } : r)),
        );
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      context?.previous?.forEach(([key, records]) => {
        queryClient.setQueryData(key, records);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenance.all });
    },
  });
}

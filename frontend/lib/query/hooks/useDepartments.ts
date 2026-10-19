import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Department {
  id: string;
  name: string;
  description?: string;
  managerId?: string;
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  memberCount: number;
  assetCount: number;
  createdAt: string;
}

export interface CreateDepartmentPayload {
  name: string;
  description?: string;
  managerId?: string;
}

export interface UpdateDepartmentPayload extends Partial<CreateDepartmentPayload> {}

export function useDepartments() {
  return useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await api.get('/departments');
      return response.data;
    },
  });
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DepartmentUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive?: boolean;
}

export interface DepartmentAsset {
  id: string;
  name: string;
  assetTag: string;
  status: string;
}

export const DEPARTMENT_PAGE_SIZE = 10;

export function useDepartmentUsers(departmentId?: string, page = 1) {
  return useQuery<Paginated<DepartmentUser>>({
    queryKey: ['departments', departmentId, 'users', page],
    queryFn: async () => {
      const response = await api.get(`/departments/${departmentId}/users`, {
        params: { page, limit: DEPARTMENT_PAGE_SIZE },
      });
      return response.data;
    },
    enabled: !!departmentId,
  });
}

export function useDepartmentAssets(departmentId?: string, page = 1) {
  return useQuery<Paginated<DepartmentAsset>>({
    queryKey: ['departments', departmentId, 'assets', page],
    queryFn: async () => {
      const response = await api.get(`/departments/${departmentId}/assets`, {
        params: { page, limit: DEPARTMENT_PAGE_SIZE },
      });
      return response.data;
    },
    enabled: !!departmentId,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateDepartmentPayload) => {
      const response = await api.post('/departments', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateDepartmentPayload }) => {
      const response = await api.patch(`/departments/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/departments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}
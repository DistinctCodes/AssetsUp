import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

// Types
export interface Asset {
  id: string;
  name: string;
  category: string;
  status: string;
  ownerId: string;
  departmentId: number;
  location: string;
}

export interface AssetTransfer {
  id: string;
  assetIds: string[];
  transferType: 'change_user' | 'change_department' | 'change_location' | 'all';
  sourceUserId?: string;
  destinationUserId?: string;
  sourceDepartmentId?: number;
  destinationDepartmentId?: number;
  sourceLocation?: string;
  destinationLocation?: string;
  reason: string;
  notes?: string;
  status: TransferStatus;
  approvalRequired: boolean;
  scheduledDate?: string;
  createdBy: string;
  approvedById?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export enum TransferStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  EXECUTED = 'executed',
  SCHEDULED = 'scheduled',
}

export interface CreateTransferDto {
  assetIds: string[];
  transferType: 'change_user' | 'change_department' | 'change_location' | 'all';
  sourceUserId?: string;
  destinationUserId?: string;
  sourceDepartmentId?: number;
  destinationDepartmentId?: number;
  sourceLocation?: string;
  destinationLocation?: string;
  reason: string;
  notes?: string;
  approvalRequired: boolean;
  scheduledDate?: string;
}

export interface ApproveTransferDto {
  approvedById: string;
  notes?: string;
}

export interface RejectTransferDto {
  rejectedById: string;
  rejectionReason: string;
}

export interface TransferFilterDto {
  status?: TransferStatus;
  createdBy?: string;
  departmentId?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// API Functions
const transferApi = {
  createTransfer: async (data: CreateTransferDto) => {
    const response = await apiClient.post<AssetTransfer>('/transfers', data);
    return response.data;
  },

  getTransfers: async (filters?: TransferFilterDto) => {
    const response = await apiClient.get<{ transfers: AssetTransfer[]; totalCount: number }>(
      '/transfers',
      { params: filters },
    );
    return response.data;
  },

  getTransferById: async (id: string) => {
    const response = await apiClient.get<AssetTransfer>(`/transfers/${id}`);
    return response.data;
  },

  approveTransfer: async (id: string, data: ApproveTransferDto) => {
    const response = await apiClient.put<AssetTransfer>(`/transfers/${id}/approve`, data);
    return response.data;
  },

  rejectTransfer: async (id: string, data: RejectTransferDto) => {
    const response = await apiClient.put<AssetTransfer>(`/transfers/${id}/reject`, data);
    return response.data;
  },

  cancelTransfer: async (id: string) => {
    const response = await apiClient.delete<AssetTransfer>(`/transfers/${id}`);
    return response.data;
  },

  getNotifications: async () => {
    const response = await apiClient.get<unknown[]>('/notifications');
    return response.data;
  },

  markNotificationAsRead: async (id: string) => {
    const response = await apiClient.put<unknown>(`/notifications/${id}/read`);
    return response.data;
  },
};

// Query Keys
export const transferKeys = {
  all: ['transfers'] as const,
  lists: () => [...transferKeys.all, 'list'] as const,
  list: (filters: TransferFilterDto) => [...transferKeys.lists(), filters] as const,
  details: () => [...transferKeys.all, 'detail'] as const,
  detail: (id: string) => [...transferKeys.details(), id] as const,
  notifications: ['notifications'] as const,
};

// Hooks
export const useTransfers = (filters?: TransferFilterDto) => {
  return useQuery({
    queryKey: transferKeys.list(filters ?? {}),
    queryFn: () => transferApi.getTransfers(filters),
    staleTime: 5 * 60 * 1000,
  });
};

export const useTransfer = (id: string) => {
  return useQuery({
    queryKey: transferKeys.detail(id),
    queryFn: () => transferApi.getTransferById(id),
    enabled: !!id,
  });
};

export const useCreateTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: transferApi.createTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transferKeys.lists() });
    },
  });
};

export const useApproveTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApproveTransferDto }) =>
      transferApi.approveTransfer(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: transferKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: transferKeys.lists() });
    },
  });
};

export const useRejectTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RejectTransferDto }) =>
      transferApi.rejectTransfer(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: transferKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: transferKeys.lists() });
    },
  });
};

export const useCancelTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: transferApi.cancelTransfer,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: transferKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: transferKeys.lists() });
    },
  });
};

export const useNotifications = () => {
  return useQuery({
    queryKey: transferKeys.notifications,
    queryFn: transferApi.getNotifications,
    staleTime: 2 * 60 * 1000,
  });
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: transferApi.markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transferKeys.notifications });
    },
  });
};
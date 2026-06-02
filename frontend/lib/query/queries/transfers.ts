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
  SCHEDULED = 'scheduled'
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
    return apiClient.request<AssetTransfer>('/transfers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getTransfers: async (filters?: TransferFilterDto) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    
    const queryString = params.toString();
    const url = `/transfers${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.request<{ transfers: AssetTransfer[]; totalCount: number }>(url);
  },

  getTransferById: async (id: string) => {
    return apiClient.request<AssetTransfer>(`/transfers/${id}`);
  },

  approveTransfer: async (id: string, data: ApproveTransferDto) => {
    return apiClient.request<AssetTransfer>(`/transfers/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  rejectTransfer: async (id: string, data: RejectTransferDto) => {
    return apiClient.request<AssetTransfer>(`/transfers/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  cancelTransfer: async (id: string) => {
    return apiClient.request<AssetTransfer>(`/transfers/${id}`, {
      method: 'DELETE',
    });
  },

  getNotifications: async () => {
    return apiClient.request<any[]>('/notifications');
  },

  markNotificationAsRead: async (id: string) => {
    return apiClient.request<any>(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }
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
    queryKey: transferKeys.list(filters || {}),
    queryFn: () => transferApi.getTransfers(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
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
    staleTime: 2 * 60 * 1000, // 2 minutes
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
import { api } from '../api';

export enum TransferStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface AssetTransfer {
  id: string;
  assetId: string;
  fromDepartmentId: string;
  toDepartmentId: string;
  requestedByUserId: string;
  approvedByUserId?: string;
  status: TransferStatus;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransferListResponse {
  items: AssetTransfer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TransferListFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export interface RejectTransferInput {
  reason: string;
}

export const transferApiClient = {
  getTransfers: (filters?: TransferListFilters): Promise<TransferListResponse> =>
    api.get<TransferListResponse>('/transfers', { params: filters }).then((r) => r.data),

  getTransfer: (id: string): Promise<AssetTransfer> =>
    api.get<AssetTransfer>(`/transfers/${id}`).then((r) => r.data),

  approveTransfer: (id: string): Promise<AssetTransfer> =>
    api.post<AssetTransfer>(`/transfers/${id}/approve`).then((r) => r.data),

  rejectTransfer: (id: string, data: RejectTransferInput): Promise<AssetTransfer> =>
    api.post<AssetTransfer>(`/transfers/${id}/reject`, data).then((r) => r.data),

  cancelTransfer: (id: string): Promise<AssetTransfer> =>
    api.post<AssetTransfer>(`/transfers/${id}/cancel`).then((r) => r.data),

  completeTransfer: (id: string): Promise<AssetTransfer> =>
    api.post<AssetTransfer>(`/transfers/${id}/complete`).then((r) => r.data),
};

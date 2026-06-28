// frontend/lib/query/types/contract.ts

export enum ContractStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  PENDING_RENEWAL = "PENDING_RENEWAL",
  TERMINATED = "TERMINATED",
}

export enum ContractType {
  SERVICE = "SERVICE",
  MAINTENANCE = "MAINTENANCE",
  SUPPORT = "SUPPORT",
  LICENSE = "LICENSE",
  LEASE = "LEASE",
  OTHER = "OTHER",
}

export interface Contract {
  id: string;
  contractId: string;
  title: string;
  vendor: string;
  contractType?: ContractType;
  startDate: string | null;
  endDate: string | null;
  value: number | null;
  status: ContractStatus;
  description: string | null;
  documentUrl: string | null;
  renewalAlertDays: number;
  notes: string | null;
  createdById: string | null;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  assignedToId: string | null;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContractListResponse {
  data: Contract[];
  total: number;
  page: number;
  limit: number;
}

export interface ContractListFilters {
  search?: string;
  status?: ContractStatus;
  vendor?: string;
  page?: number;
  limit?: number;
}

export interface CreateContractInput {
  title: string;
  vendor: string;
  contractType?: ContractType;
  startDate?: string;
  endDate?: string;
  value?: number;
  status?: ContractStatus;
  description?: string;
  renewalAlertDays?: number;
  notes?: string;
  assignedToId?: string;
}

export interface UpdateContractInput {
  title?: string;
  vendor?: string;
  contractType?: ContractType;
  startDate?: string;
  endDate?: string;
  value?: number;
  status?: ContractStatus;
  description?: string;
  renewalAlertDays?: number;
  notes?: string;
  documentUrl?: string;
  assignedToId?: string;
}

export interface ContractUploadResponse {
  key: string;
  url: string;
}

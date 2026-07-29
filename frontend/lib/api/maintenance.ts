import { api } from '../api';

export type MaintenanceType = 'PREVENTIVE' | 'CORRECTIVE' | 'SCHEDULED';
export type MaintenanceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface MaintenanceRecord {
  id: string;
  assetId: string;
  title: string;
  description?: string | null;
  type: MaintenanceType;
  status: MaintenanceStatus;
  vendorId?: string | null;
  performedByUserId?: string | null;
  cost: number;
  currency: string;
  scheduledDate?: string | null;
  completedDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceFilters {
  assetId?: string;
  status?: MaintenanceStatus;
  type?: MaintenanceType;
  departmentId?: string;
  from?: string;
  to?: string;
}

export interface CreateMaintenanceRecordInput {
  assetId: string;
  title?: string;
  description?: string;
  type?: MaintenanceType;
  vendorId?: string;
  cost?: number;
  currency?: string;
  scheduledDate: string;
  notes?: string;
}

export const maintenanceApiClient = {
  getMaintenanceRecords: (filters?: MaintenanceFilters): Promise<MaintenanceRecord[]> =>
    api.get<MaintenanceRecord[]>('/maintenance', { params: filters }).then((r) => r.data),

  getMaintenanceRecord: (id: string): Promise<MaintenanceRecord> =>
    api.get<MaintenanceRecord>(`/maintenance/${id}`).then((r) => r.data),

  createMaintenanceRecord: (data: CreateMaintenanceRecordInput): Promise<MaintenanceRecord> =>
    api.post<MaintenanceRecord>('/maintenance', data).then((r) => r.data),

  updateMaintenanceRecord: (
    id: string,
    data: Partial<CreateMaintenanceRecordInput> & { status?: MaintenanceStatus; completedDate?: string },
  ): Promise<MaintenanceRecord> =>
    api.patch<MaintenanceRecord>(`/maintenance/${id}`, data).then((r) => r.data),

  updateMaintenanceStatus: (id: string, status: MaintenanceStatus): Promise<MaintenanceRecord> =>
    api.patch<MaintenanceRecord>(`/maintenance/${id}`, { status }).then((r) => r.data),
};

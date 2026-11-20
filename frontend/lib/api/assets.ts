import { api } from '../api';
import { MAX_PAGE_SIZE, type PageParams, type Paginated } from './paginated';
import type {
  Asset,
  AssetHistoryEvent,
  AssetDocument,
  MaintenanceRecord,
  AssetNote,
  UpdateAssetStatusInput,
  TransferAssetInput,
  CreateMaintenanceInput,
  CreateNoteInput,
  AssetHistoryFilters,
  Department,
  AssetCategory,
  AssetUser,
} from '../query/types/asset';

export interface DepartmentWithCount extends Department {
  assetCount: number;
  description?: string | null;
}

export interface CategoryWithCount extends AssetCategory {
  assetCount: number;
}

export interface AssetListFilters {
  search?: string;
  status?: string;
  condition?: string;
  categoryId?: string;
  departmentId?: string;
  locationId?: string;
  /** Only assets assigned to this user id; `me` means the signed-in user. */
  assignedToId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface AssetListResponse {
  data: Asset[];
  total: number;
  page: number;
  limit: number;
}

/** What GET /assets actually returns: the rows are called `items`, not `data`. */
interface BackendAssetPage {
  items: Asset[];
  total: number;
  page: number;
  limit: number;
}

/** Maps the backend's `{ items }` page onto the `{ data }` shape the pages read. */
export function normalizeAssetPage(body: AssetListResponse | BackendAssetPage): AssetListResponse {
  if ('items' in body) {
    return { data: body.items, total: body.total, page: body.page, limit: body.limit };
  }
  return body;
}

export interface CreateAssetInput {
  name: string;
  description?: string;
  categoryId: string;
  departmentId: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currentValue?: number;
  warrantyExpiration?: string;
  status?: string;
  condition?: string;
  location?: string;
  locationId?: string;
  assignedToId?: string;
  manufacturer?: string;
  model?: string;
  tags?: string[];
  notes?: string;
}

export const assetApiClient = {
  getAssets: (filters?: AssetListFilters): Promise<AssetListResponse> =>
    api
      .get<AssetListResponse | BackendAssetPage>('/assets', { params: filters })
      .then((r) => normalizeAssetPage(r.data)),

  getAsset: (id: string): Promise<Asset> =>
    api.get<Asset>(`/assets/${id}`).then((r) => r.data),

  createAsset: (data: CreateAssetInput): Promise<Asset> =>
    api.post<Asset>('/assets', data).then((r) => r.data),

  updateAsset: (id: string, data: Partial<CreateAssetInput>): Promise<Asset> =>
    api.patch<Asset>(`/assets/${id}`, data).then((r) => r.data),

  getAssetHistory: (id: string, filters?: AssetHistoryFilters): Promise<AssetHistoryEvent[]> =>
    api.get<AssetHistoryEvent[]>(`/assets/${id}/history`, { params: filters }).then((r) => r.data),

  getAssetDocuments: (id: string): Promise<AssetDocument[]> =>
    api.get<AssetDocument[]>(`/assets/${id}/documents`).then((r) => r.data),

  getMaintenanceRecords: (id: string): Promise<MaintenanceRecord[]> =>
    api.get<MaintenanceRecord[]>(`/assets/${id}/maintenance`).then((r) => r.data),

  getAssetNotes: (id: string): Promise<AssetNote[]> =>
    api.get<AssetNote[]>(`/assets/${id}/notes`).then((r) => r.data),

  getDepartments: (params?: PageParams): Promise<Paginated<DepartmentWithCount>> =>
    api.get<Paginated<DepartmentWithCount>>('/departments', { params }).then((r) => r.data),

  /** Up to 100 departments as a plain array, for select boxes. */
  getDepartmentOptions: (): Promise<DepartmentWithCount[]> =>
    api
      .get<Paginated<DepartmentWithCount>>('/departments', { params: { limit: MAX_PAGE_SIZE } })
      .then((r) => r.data.items),

  createDepartment: (data: { name: string; description?: string }): Promise<Department> =>
    api.post<Department>('/departments', data).then((r) => r.data),

  deleteDepartment: (id: string): Promise<void> =>
    api.delete(`/departments/${id}`).then(() => undefined),

  updateDepartment: (id: string, data: { name?: string; description?: string }): Promise<Department> =>
    api.patch<Department>(`/departments/${id}`, data).then((r) => r.data),

  getCategories: (): Promise<CategoryWithCount[]> =>
    api.get<CategoryWithCount[]>('/categories').then((r) => r.data),

  createCategory: (data: { name: string; description?: string }): Promise<{ id: string; name: string }> =>
    api.post<{ id: string; name: string }>('/categories', data).then((r) => r.data),

  deleteCategory: (id: string): Promise<void> =>
    api.delete(`/categories/${id}`).then(() => undefined),

  updateCategory: (id: string, data: { name?: string; description?: string }): Promise<{ id: string; name: string }> =>
    api.patch<{ id: string; name: string }>(`/categories/${id}`, data).then((r) => r.data),

  /** Up to 100 users for pickers: GET /users is paginated, so unwrap `items`. */
  getUsers: (): Promise<AssetUser[]> =>
    api
      .get<Paginated<AssetUser>>('/users', { params: { limit: MAX_PAGE_SIZE } })
      .then((r) => r.data.items),

  updateAssetStatus: (id: string, data: UpdateAssetStatusInput): Promise<Asset> =>
    api.patch<Asset>(`/assets/${id}/status`, data).then((r) => r.data),

  transferAsset: (id: string, data: TransferAssetInput): Promise<Asset> =>
    api.post<Asset>(`/assets/${id}/transfer`, data).then((r) => r.data),

  deleteAsset: (id: string): Promise<void> =>
    api.delete(`/assets/${id}`).then(() => undefined),

  uploadDocument: (assetId: string, file: File, name?: string): Promise<AssetDocument> => {
    const form = new FormData();
    form.append('file', file);
    if (name) form.append('name', name);
    return api
      .post<AssetDocument>(`/assets/${assetId}/documents`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  createMaintenanceRecord: (assetId: string, data: CreateMaintenanceInput): Promise<MaintenanceRecord> =>
    api.post<MaintenanceRecord>(`/assets/${assetId}/maintenance`, data).then((r) => r.data),

  createNote: (assetId: string, data: CreateNoteInput): Promise<AssetNote> =>
    api.post<AssetNote>(`/assets/${assetId}/notes`, data).then((r) => r.data),

  updateMaintenanceStatus: (
    assetId: string,
    maintenanceId: string,
    status: string,
  ): Promise<MaintenanceRecord> =>
    api
      .patch<MaintenanceRecord>(`/assets/${assetId}/maintenance/${maintenanceId}`, { status })
      .then((r) => r.data),
};

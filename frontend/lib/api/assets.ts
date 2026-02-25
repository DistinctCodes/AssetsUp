import apiClient from '@/lib/api/client';
import {
  Asset,
  AssetDocument,
  AssetHistoryEvent,
  AssetHistoryFilters,
  AssetNote,
  AssetStatus,
  AssetUser,
  Category,
  CategoryWithCount,
  CreateMaintenanceInput,
  CreateNoteInput,
  Department,
  DepartmentWithCount,
  MaintenanceRecord,
  TransferAssetInput,
  UpdateAssetStatusInput,
} from '@/lib/query/types/asset';

export const assetApiClient = {
  getAssets(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: AssetStatus;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    assets: Asset[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return apiClient
      .get<{
        assets: Asset[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>('/assets', { params })
      .then((res) => res.data);
  },

  getAsset(id: string): Promise<Asset> {
    return apiClient.get<Asset>(`/assets/${id}`).then((res) => res.data);
  },

  getAssetHistory(id: string, filters?: AssetHistoryFilters): Promise<AssetHistoryEvent[]> {
    return apiClient
      .get<AssetHistoryEvent[]>(`/assets/${id}/history`, { params: filters })
      .then((res) => res.data);
  },

  getAssetDocuments(id: string): Promise<AssetDocument[]> {
    return apiClient
      .get<AssetDocument[]>(`/assets/${id}/documents`)
      .then((res) => res.data);
  },

  getMaintenanceRecords(id: string): Promise<MaintenanceRecord[]> {
    return apiClient
      .get<MaintenanceRecord[]>(`/assets/${id}/maintenance`)
      .then((res) => res.data);
  },

  getAssetNotes(id: string): Promise<AssetNote[]> {
    return apiClient.get<AssetNote[]>(`/assets/${id}/notes`).then((res) => res.data);
  },

  getDepartments(): Promise<DepartmentWithCount[]> {
    return apiClient
      .get<DepartmentWithCount[]>('/departments')
      .then((res) => res.data);
  },

  createDepartment(data: { name: string; description?: string }): Promise<Department> {
    return apiClient.post<Department>('/departments', data).then((res) => res.data);
  },

  deleteDepartment(id: string): Promise<void> {
    return apiClient.delete<void>(`/departments/${id}`).then((res) => res.data);
  },

  getCategories(): Promise<CategoryWithCount[]> {
    return apiClient
      .get<CategoryWithCount[]>('/categories')
      .then((res) => res.data);
  },

  createCategory(data: { name: string; description?: string }): Promise<Category> {
    return apiClient.post<Category>('/categories', data).then((res) => res.data);
  },

  deleteCategory(id: string): Promise<void> {
    return apiClient.delete<void>(`/categories/${id}`).then((res) => res.data);
  },

  getUsers(): Promise<AssetUser[]> {
    return apiClient.get<AssetUser[]>('/users').then((res) => res.data);
  },

  updateAssetStatus(id: string, data: UpdateAssetStatusInput): Promise<Asset> {
    return apiClient
      .patch<Asset>(`/assets/${id}/status`, data)
      .then((res) => res.data);
  },

  transferAsset(id: string, data: TransferAssetInput): Promise<Asset> {
    return apiClient.post<Asset>(`/assets/${id}/transfer`, data).then((res) => res.data);
  },

  deleteAsset(id: string): Promise<void> {
    return apiClient.delete<void>(`/assets/${id}`).then((res) => res.data);
  },

  uploadDocument(assetId: string, file: File, name?: string): Promise<AssetDocument> {
    const form = new FormData();
    form.append('file', file);
    if (name) form.append('name', name);
    return apiClient
      .post<AssetDocument>(`/assets/${assetId}/documents`, form)
      .then((res) => res.data);
  },

  deleteDocument(assetId: string, documentId: string): Promise<void> {
    return apiClient
      .delete<void>(`/assets/${assetId}/documents/${documentId}`)
      .then((res) => res.data);
  },

  createMaintenanceRecord(
    assetId: string,
    data: CreateMaintenanceInput
  ): Promise<MaintenanceRecord> {
    return apiClient
      .post<MaintenanceRecord>(`/assets/${assetId}/maintenance`, data)
      .then((res) => res.data);
  },

  createNote(assetId: string, data: CreateNoteInput): Promise<AssetNote> {
    return apiClient
      .post<AssetNote>(`/assets/${assetId}/notes`, data)
      .then((res) => res.data);
  },
};

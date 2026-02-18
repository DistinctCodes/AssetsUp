import { apiClient } from '@/lib/api/client';
import {
  Asset,
  AssetDocument,
  AssetHistoryEvent,
  AssetHistoryFilters,
  AssetNote,
  AssetUser,
  CreateMaintenanceInput,
  CreateNoteInput,
  Department,
  MaintenanceRecord,
  TransferAssetInput,
  UpdateAssetStatusInput,
} from '@/lib/query/types/asset';

export const assetApiClient = {
  getAsset(id: string): Promise<Asset> {
    return apiClient.request<Asset>(`/assets/${id}`);
  },

  getAssetHistory(id: string, filters?: AssetHistoryFilters): Promise<AssetHistoryEvent[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const qs = params.toString();
    return apiClient.request<AssetHistoryEvent[]>(
      `/assets/${id}/history${qs ? `?${qs}` : ''}`
    );
  },

  getAssetDocuments(id: string): Promise<AssetDocument[]> {
    return apiClient.request<AssetDocument[]>(`/assets/${id}/documents`);
  },

  getMaintenanceRecords(id: string): Promise<MaintenanceRecord[]> {
    return apiClient.request<MaintenanceRecord[]>(`/assets/${id}/maintenance`);
  },

  getAssetNotes(id: string): Promise<AssetNote[]> {
    return apiClient.request<AssetNote[]>(`/assets/${id}/notes`);
  },

  getDepartments(): Promise<Department[]> {
    return apiClient.request<Department[]>('/departments');
  },

  getUsers(): Promise<AssetUser[]> {
    return apiClient.request<AssetUser[]>('/users');
  },

  updateAssetStatus(id: string, data: UpdateAssetStatusInput): Promise<Asset> {
    return apiClient.request<Asset>(`/assets/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  transferAsset(id: string, data: TransferAssetInput): Promise<Asset> {
    return apiClient.request<Asset>(`/assets/${id}/transfer`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteAsset(id: string): Promise<void> {
    return apiClient.request<void>(`/assets/${id}`, { method: 'DELETE' });
  },

  uploadDocument(assetId: string, file: File, name?: string): Promise<AssetDocument> {
    const form = new FormData();
    form.append('file', file);
    if (name) form.append('name', name);
    return apiClient.request<AssetDocument>(`/assets/${assetId}/documents`, {
      method: 'POST',
      body: form,
      headers: {},
    });
  },

  deleteDocument(assetId: string, documentId: string): Promise<void> {
    return apiClient.request<void>(`/assets/${assetId}/documents/${documentId}`, {
      method: 'DELETE',
    });
  },

  createMaintenanceRecord(assetId: string, data: CreateMaintenanceInput): Promise<MaintenanceRecord> {
    return apiClient.request<MaintenanceRecord>(`/assets/${assetId}/maintenance`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  createNote(assetId: string, data: CreateNoteInput): Promise<AssetNote> {
    return apiClient.request<AssetNote>(`/assets/${assetId}/notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

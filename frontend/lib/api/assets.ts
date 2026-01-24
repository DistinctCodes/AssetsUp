import {
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
  AssetUser,
} from '../query/types/asset';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/auth-token=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * API Client for Asset management
 * Handles all asset-related HTTP requests with proper error handling
 */
class AssetApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = getAuthToken();

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'An error occurred',
        statusCode: response.status,
      }));
      throw error;
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // Asset CRUD
  async getAsset(id: string): Promise<Asset> {
    return this.request<Asset>(`/assets/${id}`);
  }

  async updateAssetStatus(id: string, data: UpdateAssetStatusInput): Promise<Asset> {
    return this.request<Asset>(`/assets/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async transferAsset(id: string, data: TransferAssetInput): Promise<Asset> {
    return this.request<Asset>(`/assets/${id}/transfer`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteAsset(id: string): Promise<void> {
    return this.request<void>(`/assets/${id}`, { method: 'DELETE' });
  }

  // History
  async getAssetHistory(id: string, filters?: AssetHistoryFilters): Promise<AssetHistoryEvent[]> {
    const params = new URLSearchParams();
    if (filters?.action) params.append('action', filters.action);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.search) params.append('search', filters.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<AssetHistoryEvent[]>(`/assets/${id}/history${query}`);
  }

  // Documents
  async getAssetDocuments(id: string): Promise<AssetDocument[]> {
    return this.request<AssetDocument[]>(`/assets/${id}/documents`);
  }

  async uploadDocument(id: string, file: File, name?: string): Promise<AssetDocument> {
    const formData = new FormData();
    formData.append('file', file);
    if (name) formData.append('name', name);

    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/assets/${id}/documents`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'Upload failed',
        statusCode: response.status,
      }));
      throw error;
    }

    return response.json();
  }

  async deleteDocument(assetId: string, documentId: string): Promise<void> {
    return this.request<void>(`/assets/${assetId}/documents/${documentId}`, {
      method: 'DELETE',
    });
  }

  // Maintenance
  async getMaintenanceRecords(id: string): Promise<MaintenanceRecord[]> {
    return this.request<MaintenanceRecord[]>(`/assets/${id}/maintenance`);
  }

  async createMaintenanceRecord(id: string, data: CreateMaintenanceInput): Promise<MaintenanceRecord> {
    return this.request<MaintenanceRecord>(`/assets/${id}/maintenance`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Notes
  async getAssetNotes(id: string): Promise<AssetNote[]> {
    return this.request<AssetNote[]>(`/assets/${id}/notes`);
  }

  async createNote(id: string, data: CreateNoteInput): Promise<AssetNote> {
    return this.request<AssetNote>(`/assets/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Departments (for transfer modal)
  async getDepartments(): Promise<Department[]> {
    return this.request<Department[]>('/departments');
  }

  // Users (for transfer modal)
  async getUsers(): Promise<AssetUser[]> {
    return this.request<AssetUser[]>('/users');
  }
}

export const assetApiClient = new AssetApiClient();

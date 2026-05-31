import type { PaginatedResponse } from './pagination.types';

export enum AssetStatus {
  AVAILABLE = 'available',
  IN_USE = 'in_use',
  UNDER_MAINTENANCE = 'under_maintenance',
  RETIRED = 'retired',
  DISPOSED = 'disposed',
}

export enum AssetCondition {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
}

export interface Asset {
  id: string;
  name: string;
  assetTag: string;
  serialNumber?: string;
  description?: string;
  status: AssetStatus;
  condition: AssetCondition;
  categoryId: string;
  departmentId?: string;
  locationId?: string;
  assignedToUserId?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  warrantyExpiresAt?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetDto {
  name: string;
  assetTag: string;
  serialNumber?: string;
  description?: string;
  status?: AssetStatus;
  condition?: AssetCondition;
  categoryId: string;
  departmentId?: string;
  locationId?: string;
  assignedToUserId?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  warrantyExpiresAt?: string;
  imageUrl?: string;
}

export interface UpdateAssetDto extends Partial<CreateAssetDto> {}

export type PaginatedAssets = PaginatedResponse<Asset>;
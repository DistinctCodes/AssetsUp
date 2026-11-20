/**
 * TypeScript types for Asset management
 */

/**
 * Mirrors the statuses the backend stores and returns
 * (backend/src/assets/asset-lifecycle.service.ts). The backend still accepts
 * ACTIVE and MAINTENANCE as input aliases, but never sends them back.
 */
export enum AssetStatus {
  AVAILABLE = 'AVAILABLE',
  ASSIGNED = 'ASSIGNED',
  IN_MAINTENANCE = 'IN_MAINTENANCE',
  IN_TRANSIT = 'IN_TRANSIT',
  RETIRED = 'RETIRED',
  DISPOSED = 'DISPOSED',
  LOST = 'LOST',
}

/** Allowed status changes, the same table the backend enforces. */
export const ASSET_STATUS_TRANSITIONS: Readonly<Record<AssetStatus, readonly AssetStatus[]>> = {
  [AssetStatus.AVAILABLE]: [
    AssetStatus.ASSIGNED,
    AssetStatus.IN_MAINTENANCE,
    AssetStatus.IN_TRANSIT,
    AssetStatus.RETIRED,
    AssetStatus.LOST,
  ],
  [AssetStatus.ASSIGNED]: [
    AssetStatus.AVAILABLE,
    AssetStatus.IN_MAINTENANCE,
    AssetStatus.IN_TRANSIT,
    AssetStatus.RETIRED,
    AssetStatus.LOST,
  ],
  [AssetStatus.IN_MAINTENANCE]: [AssetStatus.AVAILABLE, AssetStatus.ASSIGNED, AssetStatus.RETIRED],
  [AssetStatus.IN_TRANSIT]: [AssetStatus.AVAILABLE, AssetStatus.ASSIGNED, AssetStatus.LOST],
  [AssetStatus.RETIRED]: [AssetStatus.DISPOSED],
  [AssetStatus.DISPOSED]: [],
  [AssetStatus.LOST]: [AssetStatus.AVAILABLE, AssetStatus.RETIRED, AssetStatus.DISPOSED],
};

export function allowedAssetTransitions(from: AssetStatus): readonly AssetStatus[] {
  return ASSET_STATUS_TRANSITIONS[from] ?? [];
}

export enum AssetCondition {
  NEW = 'NEW',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
  DAMAGED = 'DAMAGED',
}

export interface AssetCategory {
  id: string;
  name: string;
  description?: string;
}

export interface Department {
  id: string;
  name: string;
}

export interface AssetUser {
  id: string;
  name: string;
  email: string;
}

export interface Asset {
  id: string;
  assetId: string;
  name: string;
  description: string | null;
  category: AssetCategory;
  serialNumber: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  currentValue: number | null;
  warrantyExpiration: string | null;
  status: AssetStatus;
  condition: AssetCondition;
  department: Department;
  location: string | null;
  locationId?: string | null;
  assignedTo: AssetUser | null;
  imageUrls: string[] | null;
  customFields: Record<string, unknown> | null;
  tags: string[] | null;
  manufacturer: string | null;
  model: string | null;
  barcode: string | null;
  qrCode: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: AssetUser | null;
  updatedBy: AssetUser | null;
}

export type AssetHistoryAction =
  | 'CREATED'
  | 'UPDATED'
  | 'STATUS_CHANGED'
  | 'TRANSFERRED'
  | 'MAINTENANCE'
  | 'NOTE_ADDED'
  | 'DOCUMENT_UPLOADED';

export interface AssetHistoryEvent {
  id: string;
  assetId: string;
  action: AssetHistoryAction;
  description: string;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  performedBy: AssetUser;
  createdAt: string;
}

export interface AssetDocument {
  id: string;
  assetId: string;
  name: string;
  type: string;
  url: string;
  size: number;
  uploadedBy: AssetUser;
  createdAt: string;
}

export type MaintenanceType = 'PREVENTIVE' | 'CORRECTIVE' | 'SCHEDULED';
export type MaintenanceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface MaintenanceRecord {
  id: string;
  assetId: string;
  type: MaintenanceType;
  description: string;
  scheduledDate: string;
  completedDate: string | null;
  cost: number | null;
  performedBy: AssetUser | null;
  notes: string | null;
  status: MaintenanceStatus;
  createdAt: string;
}

export interface AssetNote {
  id: string;
  assetId: string;
  content: string;
  createdBy: AssetUser;
  createdAt: string;
  updatedAt: string;
}

// Input types for mutations
export interface UpdateAssetStatusInput {
  status: AssetStatus;
  reason?: string;
}

/** At least one of `departmentId` or `assignedToId` must be provided. */
export interface TransferAssetInput {
  departmentId?: string;
  /** A user id assigns the asset; `null` clears the assignment. */
  assignedToId?: string | null;
  location?: string;
  notes?: string;
}

export interface CreateMaintenanceInput {
  type: MaintenanceType;
  description: string;
  scheduledDate: string;
  notes?: string;
}

export interface CreateNoteInput {
  content: string;
}

export interface AssetHistoryFilters {
  action?: AssetHistoryAction;
  startDate?: string;
  endDate?: string;
  search?: string;
}

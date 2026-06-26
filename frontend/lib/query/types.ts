/**
 * TypeScript types for authentication mutations
 */

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  assetCount?: number;
}

export interface Department {
  id: string;
  name: string;
  description?: string | null;
  assetCount?: number;
}

export interface AppUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface ReportsSummary {
  total: number;
  byStatus: Record<string, number>;
  byCategory: { name: string; count: number }[];
  byDepartment: { name: string; count: number }[];
  recent: {
    id: string;
    assetId: string;
    name: string;
    status: string;
    createdAt: string;
    category?: { name: string } | null;
    department?: { name: string } | null;
  }[];
}

export interface Asset {
  id: string;
  assetId: string;
  name: string;
  description: string | null;
  category: { id: string; name: string };
  serialNumber: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  currentValue: number | null;
  warrantyExpiration: string | null;
  status: string;
  condition: string;
  department: { id: string; name: string };
  location: string | null;
  assignedTo: { id: string; name: string; email: string } | null;
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
  createdBy: { id: string; name: string; email: string } | null;
}

export interface AssetListResponse {
  data: Asset[];
  total: number;
  page: number;
  limit: number;
}
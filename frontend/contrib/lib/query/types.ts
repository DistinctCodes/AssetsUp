export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface Asset {
  id: string;
  assetId: string;
  name: string;
  description: string | null;
  status: string;
  condition: string;
  location: string | null;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string };
  department: { id: string; name: string };
}

export interface Department {
  id: string;
  name: string;
  description?: string | null;
  assetCount: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  assetCount: number;
}

export interface AppUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportsSummary {
  total: number;
  byStatus: Record<string, number>;
  byCategory: { name: string; count: number }[];
  byDepartment: { name: string; count: number }[];
}

export interface AssetListResponse {
  data: Asset[];
  total: number;
  page: number;
  limit: number;
}

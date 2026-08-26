import { api } from '../api';

export interface Vendor {
  id: string;
  name: string;
  code: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  taxId?: string;
  isActive: boolean;
  notes?: string;
  assetCount?: number;
  createdAt: string;
}

export interface CreateVendorInput {
  name: string;
  code: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  taxId?: string;
  notes?: string;
}

export interface UpdateVendorInput extends Partial<CreateVendorInput> {}

export const vendorApiClient = {
  getVendors: (): Promise<Vendor[]> =>
    api.get<Vendor[]>('/vendors').then((r) => r.data),

  getVendor: (id: string): Promise<Vendor> =>
    api.get<Vendor>(`/vendors/${id}`).then((r) => r.data),

  createVendor: (data: CreateVendorInput): Promise<Vendor> =>
    api.post<Vendor>('/vendors', data).then((r) => r.data),

  updateVendor: (id: string, data: UpdateVendorInput): Promise<Vendor> =>
    api.patch<Vendor>(`/vendors/${id}`, data).then((r) => r.data),

  deleteVendor: (id: string): Promise<void> =>
    api.delete(`/vendors/${id}`).then(() => undefined),

  getVendorAssets: (id: string): Promise<unknown[]> =>
    api.get<unknown[]>(`/vendors/${id}/assets`).then((r) => r.data),
};

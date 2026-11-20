import { api } from '../api';
import { MAX_PAGE_SIZE, type PageParams, type Paginated } from './paginated';

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
  getVendors: (params?: PageParams): Promise<Paginated<Vendor>> =>
    api.get<Paginated<Vendor>>('/vendors', { params }).then((r) => r.data),

  /** Up to 100 vendors as a plain array, for select boxes. */
  getVendorOptions: (): Promise<Vendor[]> =>
    api
      .get<Paginated<Vendor>>('/vendors', { params: { limit: MAX_PAGE_SIZE } })
      .then((r) => r.data.items),

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

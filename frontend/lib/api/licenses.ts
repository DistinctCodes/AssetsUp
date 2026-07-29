import { api } from '../api';

export enum LicenseType {
  PERPETUAL = 'PERPETUAL',
  SUBSCRIPTION = 'SUBSCRIPTION',
}

export enum BillingPeriod {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  ONE_TIME = 'ONE_TIME',
}

export interface License {
  id: string;
  name: string;
  vendorId?: string | null;
  type: LicenseType;
  billingPeriod: BillingPeriod;
  seatsTotal: number;
  seatsUsed: number;
  startDate?: string | null;
  expiryDate?: string | null;
  cost: number;
  currency: string;
  autoRenew: boolean;
  notes?: string | null;
  renewsSoon: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SeatAssignment {
  id: string;
  licenseId: string;
  userId: string;
  assignedAt: string;
  unassignedAt?: string | null;
}

export interface CreateLicenseInput {
  name: string;
  vendorId?: string;
  licenseKey: string;
  type?: LicenseType;
  billingPeriod?: BillingPeriod;
  seatsTotal: number;
  startDate?: string;
  expiryDate?: string;
  cost?: number;
  currency?: string;
  autoRenew?: boolean;
  notes?: string;
}

export interface UpdateLicenseInput extends Partial<CreateLicenseInput> {}

export const licenseApiClient = {
  getLicenses: (): Promise<License[]> => api.get<License[]>('/licenses').then((r) => r.data),

  getLicense: (id: string): Promise<License> =>
    api.get<License>(`/licenses/${id}`).then((r) => r.data),

  createLicense: (data: CreateLicenseInput): Promise<License> =>
    api.post<License>('/licenses', data).then((r) => r.data),

  updateLicense: (id: string, data: UpdateLicenseInput): Promise<License> =>
    api.patch<License>(`/licenses/${id}`, data).then((r) => r.data),

  deleteLicense: (id: string): Promise<void> =>
    api.delete(`/licenses/${id}`).then(() => undefined),

  revealKey: (id: string): Promise<{ licenseKey: string }> =>
    api.post<{ licenseKey: string }>(`/licenses/${id}/reveal-key`).then((r) => r.data),

  getAssignments: (id: string): Promise<SeatAssignment[]> =>
    api.get<SeatAssignment[]>(`/licenses/${id}/assignments`).then((r) => r.data),

  assignSeat: (id: string, userId: string): Promise<License> =>
    api.post<License>(`/licenses/${id}/assign`, { userId }).then((r) => r.data),

  unassignSeat: (id: string, assignmentId: string): Promise<License> =>
    api
      .post<License>(`/licenses/${id}/assignments/${assignmentId}/unassign`)
      .then((r) => r.data),
};

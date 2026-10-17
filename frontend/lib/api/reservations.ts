import { api } from '../api';

export interface Reservation {
  id: string;
  assetName: string;
  assetId: string;
  purpose: string;
  startsAt: string;
  endsAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  requester: string;
}

export interface CreateReservationInput {
  assetId: string;
  purpose: string;
  startsAt: string;
  endsAt: string;
}

export const reservationsApiClient = {
  listMine: (): Promise<Reservation[]> =>
    api.get<Reservation[]>('/reservations/mine').then((r) => r.data),

  listAll: (): Promise<Reservation[]> =>
    api.get<Reservation[]>('/reservations').then((r) => r.data),

  create: (data: CreateReservationInput): Promise<Reservation> =>
    api.post<Reservation>('/reservations', data).then((r) => r.data),

  cancel: (id: string, reason?: string): Promise<Reservation> =>
    api.patch<Reservation>(`/reservations/${id}/cancel`, { reason }).then((r) => r.data),

  confirm: (id: string): Promise<Reservation> =>
    api.patch<Reservation>(`/reservations/${id}/confirm`).then((r) => r.data),

  getAvailability: (assetId: string, startsAt: string, endsAt: string): Promise<{ available: boolean; conflicts?: Reservation[] }> =>
    api.get(`/reservations/availability`, { params: { assetId, startsAt, endsAt } }).then((r) => r.data),
};
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

export interface BusyWindow {
  startsAt: string;
  endsAt: string;
}

/** A reservation as the backend returns it: the asset and requester are nested relations. */
interface ReservationRecord {
  id: string;
  assetId: string;
  asset?: { name?: string } | null;
  reservedBy?: { firstName?: string; lastName?: string; email?: string } | null;
  purpose?: string;
  startsAt: string;
  endsAt: string;
  status: Reservation['status'];
}

/** Flattens the backend record into the shape the page renders. */
export function toReservation(record: ReservationRecord): Reservation {
  const who = record.reservedBy;
  const requester = who
    ? [who.firstName, who.lastName].filter(Boolean).join(' ') || who.email || 'Unknown'
    : 'Unknown';
  return {
    id: record.id,
    assetId: record.assetId,
    assetName: record.asset?.name ?? record.assetId,
    purpose: record.purpose ?? '',
    startsAt: record.startsAt,
    endsAt: record.endsAt,
    status: record.status,
    requester,
  };
}

export const reservationsApiClient = {
  /** The backend has no "mine" route: it filters GET /reservations by userId. */
  listMine: (userId: string): Promise<Reservation[]> =>
    api
      .get<ReservationRecord[]>('/reservations', { params: { userId } })
      .then((r) => r.data.map(toReservation)),

  listAll: (): Promise<Reservation[]> =>
    api
      .get<ReservationRecord[]>('/reservations')
      .then((r) => r.data.map(toReservation)),

  create: (data: CreateReservationInput): Promise<Reservation> =>
    api.post<Reservation>('/reservations', data).then((r) => r.data),

  cancel: (id: string, reason?: string): Promise<Reservation> =>
    api.patch<Reservation>(`/reservations/${id}/cancel`, { reason }).then((r) => r.data),

  confirm: (id: string): Promise<Reservation> =>
    api.patch<Reservation>(`/reservations/${id}/confirm`).then((r) => r.data),

  /** Confirmed reservations overlapping [from, to]: GET /assets/:id/availability. */
  getAvailability: (assetId: string, from: string, to: string): Promise<{ busy: BusyWindow[] }> =>
    api
      .get<{ busy: BusyWindow[] }>(`/assets/${encodeURIComponent(assetId)}/availability`, {
        params: { from, to },
      })
      .then((r) => r.data),
};
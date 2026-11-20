import { api } from '../api';
import type { Paginated } from './paginated';

export type MyRequestType = 'transfer' | 'reservation';

export interface MyRequest {
  id: string;
  type: MyRequestType;
  title: string;
  status: string;
  createdAt: string;
}

interface TransferRecord {
  id: string;
  assetId: string;
  status: string;
  createdAt: string;
}

interface ReservationRecord {
  id: string;
  assetId: string;
  asset?: { name?: string } | null;
  purpose?: string;
  startsAt: string;
  status: string;
  createdAt?: string;
}

export function fromTransfer(transfer: TransferRecord): MyRequest {
  return {
    id: transfer.id,
    type: 'transfer',
    title: `Transfer request for asset ${transfer.assetId}`,
    status: transfer.status,
    createdAt: transfer.createdAt,
  };
}

export function fromReservation(reservation: ReservationRecord): MyRequest {
  const asset = reservation.asset?.name ?? reservation.assetId;
  return {
    id: reservation.id,
    type: 'reservation',
    title: reservation.purpose ? `${asset}: ${reservation.purpose}` : `Reservation for ${asset}`,
    status: reservation.status,
    createdAt: reservation.createdAt ?? reservation.startsAt,
  };
}

/** Newest first. */
export const byNewest = (a: MyRequest, b: MyRequest) =>
  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

export const myRequestsApiClient = {
  /**
   * The signed-in user's pending transfer requests (GET /transfers?requestedByUserId=me)
   * and pending reservations (GET /reservations?userId=<me>), merged into one list.
   */
  list: async (userId: string): Promise<MyRequest[]> => {
    const [transfers, reservations] = await Promise.all([
      api
        .get<Paginated<TransferRecord>>('/transfers', {
          params: { requestedByUserId: 'me', status: 'PENDING', limit: 100 },
        })
        .then((r) => r.data.items),
      api
        .get<ReservationRecord[]>('/reservations', { params: { userId, status: 'PENDING' } })
        .then((r) => r.data),
    ]);
    return [...transfers.map(fromTransfer), ...reservations.map(fromReservation)].sort(byNewest);
  },
};

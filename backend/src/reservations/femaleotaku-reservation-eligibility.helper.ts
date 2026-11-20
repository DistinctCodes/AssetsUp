export type ReservableAssetStatus = 'AVAILABLE' | 'ASSIGNED' | 'IN_MAINTENANCE' | 'RETIRED' | 'DISPOSED' | 'LOST' | string;

export interface ReservationEligibilityInput {
  assetStatus: ReservableAssetStatus;
  startsAt: string | Date;
  endsAt: string | Date;
  now?: Date;
  graceMs?: number;
}

export interface EligibilityResult {
  ok: boolean;
  reason?: string;
}

const ALLOWED_STATUSES = new Set<ReservableAssetStatus>(['AVAILABLE', 'ASSIGNED']);

export function validateReservationEligibility(input: ReservationEligibilityInput): EligibilityResult {
  if (!ALLOWED_STATUSES.has(input.assetStatus)) {
    return { ok: false, reason: `Asset status ${input.assetStatus} is not reservable` };
  }
  const start = input.startsAt instanceof Date ? input.startsAt : new Date(input.startsAt);
  const end = input.endsAt instanceof Date ? input.endsAt : new Date(input.endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false, reason: 'Invalid reservation window' };
  }
  if (start >= end) return { ok: false, reason: 'startsAt must be before endsAt' };
  const now = input.now ?? new Date();
  const graceMs = input.graceMs ?? 60_000;
  if (start.getTime() < now.getTime() - graceMs) {
    return { ok: false, reason: 'Reservations cannot start in the past' };
  }
  return { ok: true };
}

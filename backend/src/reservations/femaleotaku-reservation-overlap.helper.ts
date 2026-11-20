export interface OverlapReservation {
  id?: string;
  assetId: string;
  startsAt: string | Date;
  endsAt: string | Date;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | string;
}

export interface OverlapCandidate {
  assetId: string;
  startsAt: string | Date;
  endsAt: string | Date;
}

function toMs(value: string | Date): number {
  return (value instanceof Date ? value : new Date(value)).getTime();
}

export function hasReservationOverlap(
  existing: ReadonlyArray<OverlapReservation>,
  candidate: OverlapCandidate,
): boolean {
  const start = toMs(candidate.startsAt);
  const end = toMs(candidate.endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) return false;
  return existing.some((r) => {
    if (r.assetId !== candidate.assetId) return false;
    if (r.status !== 'PENDING' && r.status !== 'CONFIRMED') return false;
    const rs = toMs(r.startsAt);
    const re = toMs(r.endsAt);
    return rs < end && re > start;
  });
}

export function reservationOverlapConstraintSql(): string {
  return `ALTER TABLE reservations ADD CONSTRAINT reservations_no_overlap EXCLUDE USING gist ("assetId" WITH =, tstzrange("startsAt","endsAt") WITH &&) WHERE (status IN ('PENDING','CONFIRMED'));`;
}

export function isReservationOverlapViolation(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  const msg = String((error as { message?: string })?.message ?? '');
  return code === '23P01' || /exclusion|overlap|reservations_no_overlap/i.test(msg);
}

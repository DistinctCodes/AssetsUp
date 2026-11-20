export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface ReservationWindow {
  id?: string;
  startsAt: string | Date;
  endsAt: string | Date;
  status: ReservationStatus;
}

export interface AvailabilityBusySlot {
  startsAt: string;
  endsAt: string;
  status: 'PENDING' | 'CONFIRMED';
  tentative: boolean;
}

export interface AvailabilityResult {
  busy: AvailabilityBusySlot[];
}

export interface AvailabilityQuery {
  from: string;
  to: string;
}

function toDate(value: string | Date): Date {
  const d = value instanceof Date ? value : new Date(value);
  return d;
}

export function parseAvailabilityQuery(query: Partial<AvailabilityQuery>): { from: Date; to: Date } {
  if (!query.from || !query.to) throw new Error('from and to are required');
  const from = new Date(query.from);
  const to = new Date(query.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) throw new Error('Invalid from/to date');
  if (from >= to) throw new Error('from must be before to');
  return { from, to };
}

export function getReservationAvailability(
  reservations: ReadonlyArray<ReservationWindow>,
  query: Partial<AvailabilityQuery>,
): AvailabilityResult {
  const { from, to } = parseAvailabilityQuery(query);
  const busy = reservations
    .filter((r) => r.status === 'PENDING' || r.status === 'CONFIRMED')
    .map((r) => ({ ...r, start: toDate(r.startsAt), end: toDate(r.endsAt) }))
    .filter((r) => !Number.isNaN(r.start.getTime()) && !Number.isNaN(r.end.getTime()))
    .filter((r) => r.start < to && r.end > from)
    .map((r) => ({
      startsAt: r.start.toISOString(),
      endsAt: r.end.toISOString(),
      status: r.status as 'PENDING' | 'CONFIRMED',
      tentative: r.status === 'PENDING',
    }))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return { busy };
}

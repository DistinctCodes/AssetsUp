import { hasReservationOverlap, isReservationOverlapViolation, reservationOverlapConstraintSql } from './femaleotaku-reservation-overlap.helper';

describe('femaleotaku-reservation-overlap.helper', () => {
  it('detects overlapping active reservations for same asset', () => {
    const conflict = hasReservationOverlap(
      [{ assetId: 'a1', startsAt: '2026-11-20T10:00:00Z', endsAt: '2026-11-20T11:00:00Z', status: 'CONFIRMED' }],
      { assetId: 'a1', startsAt: '2026-11-20T10:30:00Z', endsAt: '2026-11-20T11:30:00Z' },
    );
    expect(conflict).toBe(true);
  });

  it('provides exclusion constraint SQL and maps violation', () => {
    expect(reservationOverlapConstraintSql()).toContain('EXCLUDE USING gist');
    expect(isReservationOverlapViolation({ code: '23P01' })).toBe(true);
  });
});

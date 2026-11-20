import { validateReservationEligibility } from './femaleotaku-reservation-eligibility.helper';

describe('femaleotaku-reservation-eligibility.helper', () => {
  const now = new Date('2026-11-20T10:00:00Z');

  it('blocks non-reservable statuses', () => {
    for (const status of ['RETIRED', 'DISPOSED', 'LOST', 'IN_MAINTENANCE']) {
      const res = validateReservationEligibility({
        assetStatus: status,
        startsAt: '2026-11-20T11:00:00Z',
        endsAt: '2026-11-20T12:00:00Z',
        now,
      });
      expect(res.ok).toBe(false);
    }
  });

  it('blocks past windows but allows available assets', () => {
    expect(
      validateReservationEligibility({
        assetStatus: 'AVAILABLE',
        startsAt: '2026-11-20T09:00:00Z',
        endsAt: '2026-11-20T09:30:00Z',
        now,
      }).ok,
    ).toBe(false);
    expect(
      validateReservationEligibility({
        assetStatus: 'ASSIGNED',
        startsAt: '2026-11-20T10:30:00Z',
        endsAt: '2026-11-20T11:00:00Z',
        now,
      }).ok,
    ).toBe(true);
  });
});

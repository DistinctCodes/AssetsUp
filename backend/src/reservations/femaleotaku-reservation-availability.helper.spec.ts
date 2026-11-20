import { getReservationAvailability, parseAvailabilityQuery } from './femaleotaku-reservation-availability.helper';

describe('femaleotaku-reservation-availability.helper', () => {
  it('rejects invalid or missing dates', () => {
    expect(() => parseAvailabilityQuery({})).toThrow();
    expect(() => parseAvailabilityQuery({ from: 'nope', to: '2026-01-02' })).toThrow();
  });

  it('includes pending reservations as tentative busy slots', () => {
    const result = getReservationAvailability(
      [
        { startsAt: '2026-11-20T10:00:00Z', endsAt: '2026-11-20T11:00:00Z', status: 'PENDING' },
        { startsAt: '2026-11-20T12:00:00Z', endsAt: '2026-11-20T13:00:00Z', status: 'CONFIRMED' },
        { startsAt: '2026-11-20T14:00:00Z', endsAt: '2026-11-20T15:00:00Z', status: 'CANCELLED' },
      ],
      { from: '2026-11-20T00:00:00Z', to: '2026-11-21T00:00:00Z' },
    );
    expect(result.busy).toHaveLength(2);
    expect(result.busy[0]).toEqual(expect.objectContaining({ status: 'PENDING', tentative: true }));
    expect(result.busy[1]).toEqual(expect.objectContaining({ status: 'CONFIRMED', tentative: false }));
  });
});

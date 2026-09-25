import {
  DEFAULT_MAX_OCCURRENCES,
  RECURRENCE_FREQUENCIES,
  advance,
  generateOccurrences,
  nextOccurrence,
} from './recurrence';

const START = new Date('2026-01-15T09:00:00.000Z');
const now = new Date('2026-01-01T00:00:00.000Z');

function iso(date: Date): string {
  return date.toISOString();
}

describe('recurrence frequencies', () => {
  it('supports daily, weekly, monthly, quarterly and yearly', () => {
    expect(RECURRENCE_FREQUENCIES).toEqual([
      'DAILY',
      'WEEKLY',
      'MONTHLY',
      'QUARTERLY',
      'YEARLY',
    ]);
  });
});

describe('advance', () => {
  it('steps forward by the interval', () => {
    expect(iso(advance(START, 'DAILY', 3))).toBe('2026-01-18T09:00:00.000Z');
    expect(iso(advance(START, 'WEEKLY', 2))).toBe('2026-01-29T09:00:00.000Z');
  });

  it('defaults to a single interval', () => {
    expect(iso(advance(START, 'DAILY'))).toBe('2026-01-16T09:00:00.000Z');
  });

  it('clamps to the last day of shorter months', () => {
    expect(iso(advance(new Date('2026-01-31T00:00:00.000Z'), 'MONTHLY'))).toBe(
      '2026-02-28T00:00:00.000Z',
    );
  });

  it('handles leap years', () => {
    expect(iso(advance(new Date('2028-01-31T00:00:00.000Z'), 'MONTHLY'))).toBe(
      '2028-02-29T00:00:00.000Z',
    );
  });

  it('supports quarterly and yearly steps', () => {
    expect(iso(advance(START, 'QUARTERLY'))).toBe('2026-04-15T09:00:00.000Z');
    expect(iso(advance(START, 'YEARLY'))).toBe('2027-01-15T09:00:00.000Z');
  });

  it('treats a non positive interval as one', () => {
    expect(iso(advance(START, 'DAILY', 0))).toBe('2026-01-16T09:00:00.000Z');
  });

  it('does not mutate the input date', () => {
    advance(START, 'MONTHLY');
    expect(iso(START)).toBe('2026-01-15T09:00:00.000Z');
  });
});

describe('generateOccurrences', () => {
  it('returns future occurrences in order', () => {
    const dates = generateOccurrences(START, { frequency: 'WEEKLY', count: 3 }, { now });
    expect(dates.map(iso)).toEqual([
      '2026-01-15T09:00:00.000Z',
      '2026-01-22T09:00:00.000Z',
      '2026-01-29T09:00:00.000Z',
    ]);
  });

  it('skips occurrences already in the past', () => {
    const dates = generateOccurrences(START, { frequency: 'DAILY', count: 3 }, {
      now: new Date('2026-01-16T12:00:00.000Z'),
    });
    expect(dates.map(iso)).toEqual([
      '2026-01-17T09:00:00.000Z',
      '2026-01-18T09:00:00.000Z',
      '2026-01-19T09:00:00.000Z',
    ]);
  });

  it('honours the count', () => {
    expect(generateOccurrences(START, { frequency: 'DAILY', count: 2 }, { now })).toHaveLength(2);
  });

  it('stops at the until date', () => {
    const dates = generateOccurrences(
      START,
      { frequency: 'DAILY', until: '2026-01-17T09:00:00.000Z' },
      { now },
    );
    expect(dates).toHaveLength(3);
  });

  it('caps the number of occurrences', () => {
    const dates = generateOccurrences(START, { frequency: 'DAILY' }, { now, maxOccurrences: 5 });
    expect(dates).toHaveLength(5);
    expect(DEFAULT_MAX_OCCURRENCES).toBe(100);
  });

  it('returns nothing for a zero count or an unusable start', () => {
    expect(generateOccurrences(START, { frequency: 'DAILY', count: 0 }, { now })).toEqual([]);
    expect(generateOccurrences('not-a-date', { frequency: 'DAILY' }, { now })).toEqual([]);
  });

  it('returns nothing when the schedule has already ended', () => {
    expect(
      generateOccurrences(START, { frequency: 'DAILY', until: '2025-01-01T00:00:00.000Z' }, { now }),
    ).toEqual([]);
  });
});

describe('nextOccurrence', () => {
  it('returns the soonest upcoming date', () => {
    expect(iso(nextOccurrence(START, { frequency: 'MONTHLY' }, { now })!)).toBe(
      '2026-01-15T09:00:00.000Z',
    );
  });

  it('returns null when the schedule is finished', () => {
    expect(nextOccurrence(START, { frequency: 'DAILY', until: '2025-01-01' }, { now })).toBeNull();
  });
});

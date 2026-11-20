import { scheduleNextRecurringMaintenance } from './ibinola-maintenance-recurrence.helper';

describe('ibinola-maintenance-recurrence.helper', () => {
  it('schedules the next monthly record after completion', () => {
    const next = scheduleNextRecurringMaintenance(
      {
        title: 'Inspect HVAC',
        assetId: 'asset-1',
        recurrence: { frequency: 'MONTHLY', interval: 1 },
        referenceDate: '2026-01-15T00:00:00.000Z',
      },
      new Date('2026-01-20T00:00:00.000Z'),
    );
    expect(next).not.toBeNull();
    expect(next?.status).toBe('SCHEDULED');
    expect(next?.scheduledDate.toISOString()).toBe('2026-02-15T00:00:00.000Z');
    expect(next?.assetId).toBe('asset-1');
  });

  it('returns null when recurrence is missing', () => {
    expect(
      scheduleNextRecurringMaintenance({
        title: 'One-off',
        recurrence: undefined as any,
        referenceDate: '2026-01-15T00:00:00.000Z',
      }),
    ).toBeNull();
  });
});

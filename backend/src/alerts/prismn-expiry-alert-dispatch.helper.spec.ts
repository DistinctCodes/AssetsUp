import { dedupeExpiryAlertPlans, selectExpiryAlertPlans } from './prismn-expiry-alert-dispatch.helper';

describe('prismn-expiry-alert-dispatch.helper', () => {
  it('builds alert plans for expiring licenses/warranties within window', () => {
    const now = new Date('2026-11-20T00:00:00Z');
    const plans = selectExpiryAlertPlans(
      [
        { id: 'lic-1', name: 'Office', expiryDate: '2026-11-25T00:00:00Z', kind: 'LICENSE', ownerUserId: 'u1' },
        { id: 'w-1', name: 'Laptop warranty', expiryDate: '2026-12-30T00:00:00Z', kind: 'WARRANTY', ownerUserId: 'u2' },
      ],
      { now, warningDays: 30 },
    );
    expect(plans).toHaveLength(1);
    expect(plans[0].notificationKey).toBe('LICENSE:lic-1:5');
    expect(plans[0].ownerUserId).toBe('u1');
  });

  it('is idempotent per item/window via dedupe', () => {
    const plans = selectExpiryAlertPlans(
      [{ id: 'lic-1', name: 'Office', expiryDate: '2026-11-20T00:00:00Z', kind: 'LICENSE' }],
      { now: new Date('2026-11-20T00:00:00Z'), warningDays: 30 },
    );
    const once = dedupeExpiryAlertPlans(plans, new Set());
    const twice = dedupeExpiryAlertPlans(plans, new Set(once.map((p) => p.notificationKey)));
    expect(once).toHaveLength(1);
    expect(twice).toHaveLength(0);
  });
});

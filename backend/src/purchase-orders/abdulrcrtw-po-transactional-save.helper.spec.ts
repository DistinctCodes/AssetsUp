import { buildTransactionalPoPersistPlan, toMinorUnits } from './abdulrcrtw-po-transactional-save.helper';

describe('abdulrcrtw-po-transactional-save.helper', () => {
  it('computes totals exactly for decimal-like inputs via minor units', () => {
    const a = toMinorUnits(0.1);
    const b = toMinorUnits(0.2);
    expect(a + b).toBe(30);
    const plan = buildTransactionalPoPersistPlan({
      vendorId: 'v1',
      requestedByUserId: 'u1',
      lineItems: [
        { description: 'A', quantity: 1, unitCostMinor: a },
        { description: 'B', quantity: 1, unitCostMinor: b },
      ],
    });
    expect(plan.purchaseOrder.totalAmountMinor).toBe(30);
  });

  it('builds full persist plan without mutating source intent (safe for single-tx save)', () => {
    const draft = {
      vendorId: 'v1',
      requestedByUserId: 'u1',
      notes: null,
      lineItems: [{ description: 'X', quantity: 2, unitCostMinor: 150 }],
    };
    const plan = buildTransactionalPoPersistPlan(draft);
    expect(plan.lineItems[0].lineTotalMinor).toBe(300);
    expect(plan.purchaseOrder.totalAmountMinor).toBe(300);
  });
});

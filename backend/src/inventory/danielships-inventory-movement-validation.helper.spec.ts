import { applyMovementAtomically, movementDelta, validateMovementRequest } from './danielships-inventory-movement-validation.helper';

describe('danielships-inventory-movement-validation.helper', () => {
  it('rejects invalid bodies', () => {
    const errors = validateMovementRequest({ type: 'IN' as any, quantity: '5' as any });
    expect(errors.some((e) => e.field === 'quantity')).toBe(true);
    expect(validateMovementRequest({ type: 'OUT', quantity: -1 }).length).toBeGreaterThan(0);
  });

  it('computes deltas and prevents negative stock', () => {
    expect(movementDelta('IN', 5)).toBe(5);
    expect(movementDelta('OUT', 3)).toBe(-3);
    expect(applyMovementAtomically(2, -3).ok).toBe(false);
    expect(applyMovementAtomically(2, 3)).toEqual({ ok: true, nextQuantity: 5 });
  });
});

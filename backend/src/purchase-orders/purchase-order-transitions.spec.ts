import {
  PURCHASE_ORDER_STATUSES,
  PURCHASE_ORDER_TRANSITIONS,
  allowedTransitions,
  assertTransition,
  canTransition,
  describeIllegalTransition,
  isAlreadyInStatus,
  isKnownPurchaseOrderStatus,
  isTerminalStatus,
} from './purchase-order-transitions';

describe('purchase-order-transitions', () => {
  it('knows every purchase order status', () => {
    expect(PURCHASE_ORDER_STATUSES).toEqual([
      'DRAFT',
      'SUBMITTED',
      'APPROVED',
      'RECEIVED',
      'CANCELLED',
    ]);
    for (const status of PURCHASE_ORDER_STATUSES) {
      expect(isKnownPurchaseOrderStatus(status)).toBe(true);
    }
    expect(isKnownPurchaseOrderStatus('SHIPPED')).toBe(false);
    expect(isKnownPurchaseOrderStatus(null)).toBe(false);
  });

  it('defines transitions for every known status', () => {
    for (const status of PURCHASE_ORDER_STATUSES) {
      expect(PURCHASE_ORDER_TRANSITIONS[status]).toBeDefined();
    }
  });

  it('allows the happy path', () => {
    expect(canTransition('DRAFT', 'SUBMITTED')).toBe(true);
    expect(canTransition('SUBMITTED', 'APPROVED')).toBe(true);
    expect(canTransition('APPROVED', 'RECEIVED')).toBe(true);
  });

  it('allows cancelling a draft or a submitted order', () => {
    expect(canTransition('DRAFT', 'CANCELLED')).toBe(true);
    expect(canTransition('SUBMITTED', 'CANCELLED')).toBe(true);
  });

  it('rejects transitions out of terminal states', () => {
    expect(isTerminalStatus('RECEIVED')).toBe(true);
    expect(isTerminalStatus('CANCELLED')).toBe(true);
    expect(allowedTransitions('RECEIVED')).toEqual([]);
    expect(canTransition('RECEIVED', 'APPROVED')).toBe(false);
  });

  it('rejects skipping a step', () => {
    expect(canTransition('DRAFT', 'APPROVED')).toBe(false);
    expect(canTransition('DRAFT', 'RECEIVED')).toBe(false);
  });

  it('never allows a status to be applied twice', () => {
    for (const status of PURCHASE_ORDER_STATUSES) {
      expect(canTransition(status, status)).toBe(false);
    }
    expect(canTransition('APPROVED', 'APPROVED')).toBe(false);
    expect(isAlreadyInStatus('APPROVED', 'APPROVED')).toBe(true);
    expect(isAlreadyInStatus('SUBMITTED', 'APPROVED')).toBe(false);
  });

  it('treats an unknown status as having no transitions', () => {
    expect(allowedTransitions('NOPE')).toEqual([]);
    expect(isTerminalStatus('NOPE')).toBe(true);
  });

  it('throws a clear error when approving twice', () => {
    expect(() => assertTransition('SUBMITTED', 'APPROVED')).not.toThrow();
    expect(() => assertTransition('APPROVED', 'APPROVED')).toThrow(
      /already APPROVED/i,
    );
  });

  it('lists the allowed next steps in the error message', () => {
    expect(() => assertTransition('DRAFT', 'RECEIVED')).toThrow(/Allowed: SUBMITTED, CANCELLED/);
  });

  it('describes a terminal source without suggesting next steps', () => {
    expect(describeIllegalTransition('CANCELLED', 'APPROVED')).toBe(
      'Purchase order is CANCELLED and cannot transition to APPROVED',
    );
  });
});

import {
  describeIllegalTransition,
} from './purchase-order-transitions';
import {
  explainPurchaseOrderAction,
  validatePurchaseOrderAction,
} from './prismn-purchase-order-transition.helper';

describe('prismn-purchase-order-transition.helper', () => {
  it('routes actions through the transitions module', () => {
    expect(() => validatePurchaseOrderAction('DRAFT', 'submit')).not.toThrow();
    expect(() => validatePurchaseOrderAction('APPROVED', 'submit')).toThrow(
      describeIllegalTransition('APPROVED', 'SUBMITTED'),
    );
  });

  it('returns canonical transition error messages', () => {
    expect(explainPurchaseOrderAction('RECEIVED', 'cancel')).toBe(
      describeIllegalTransition('RECEIVED', 'CANCELLED'),
    );
    expect(explainPurchaseOrderAction('SUBMITTED', 'approve')).toBe('');
  });
});

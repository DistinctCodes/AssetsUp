import { canApprovePurchaseOrder } from './abdulrcrtw-po-approval-role.helper';

describe('abdulrcrtw-po-approval-role.helper', () => {
  it('forbids EMPLOYEE approval', () => {
    expect(
      canApprovePurchaseOrder({ creatorUserId: 'u1', approverUserId: 'u2', approverRole: 'EMPLOYEE' }).allowed,
    ).toBe(false);
  });

  it('forbids self-approval by creator', () => {
    const res = canApprovePurchaseOrder({ creatorUserId: 'u1', approverUserId: 'u1', approverRole: 'ADMIN' });
    expect(res.allowed).toBe(false);
  });

  it('allows manager approving someone else order', () => {
    expect(
      canApprovePurchaseOrder({ creatorUserId: 'u1', approverUserId: 'u2', approverRole: 'MANAGER' }).allowed,
    ).toBe(true);
  });
});

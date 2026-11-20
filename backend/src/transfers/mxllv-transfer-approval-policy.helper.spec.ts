import { canApproveTransferPolicy, canRejectTransferPolicy } from './mxllv-transfer-approval-policy.helper';

describe('mxllv-transfer-approval-policy.helper', () => {
  it('denies EMPLOYEE and self-approval', () => {
    expect(
      canApproveTransferPolicy({ status: 'PENDING', requestedByUserId: 'u1', approverUserId: 'u2', approverRole: 'EMPLOYEE' }).allowed,
    ).toBe(false);
    expect(
      canApproveTransferPolicy({ status: 'PENDING', requestedByUserId: 'u1', approverUserId: 'u1', approverRole: 'ADMIN' }).reason,
    ).toContain('requesting user');
  });

  it('allows manager to reject pending transfer', () => {
    expect(
      canRejectTransferPolicy({ status: 'PENDING', requestedByUserId: 'u1', approverUserId: 'u2', approverRole: 'MANAGER' }).allowed,
    ).toBe(true);
  });
});

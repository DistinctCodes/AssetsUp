import { planTransferApprovalTx } from './mxllv-transfer-approval-transaction.helper';

describe('mxllv-transfer-approval-transaction.helper', () => {
  it('fails when transfer not pending (guards double approval/concurrency intent)', () => {
    const plan = planTransferApprovalTx({
      transfer: { id: 't1', assetId: 'a1', status: 'APPROVED' },
      asset: { id: 'a1', status: 'ASSIGNED' },
    });
    expect(plan.ok).toBe(false);
  });

  it('plans history event and department move for valid approval', () => {
    const plan = planTransferApprovalTx({
      transfer: { id: 't1', assetId: 'a1', status: 'PENDING', fromDepartmentId: 'd1', toDepartmentId: 'd2' },
      asset: { id: 'a1', status: 'ASSIGNED', departmentId: 'd1' },
    });
    expect(plan.ok).toBe(true);
    expect(plan.asset?.departmentId).toBe('d2');
    expect(plan.historyEvent?.type).toBe('TRANSFERRED');
  });
});

import { applyPurchaseOrderApproval } from './abdulrcrtw-po-approval-record.helper';

describe('abdulrcrtw-po-approval-record.helper', () => {
  it('stores approver/time and never overwrites createdByUserId', () => {
    const original = { id: 'po-1', createdByUserId: 'creator' };
    const approved = applyPurchaseOrderApproval(original, 'approver', new Date('2026-11-20T08:00:00Z'));
    expect(approved.createdByUserId).toBe('creator');
    expect(approved.approvedByUserId).toBe('approver');
    expect(approved.approvedAt).toBe('2026-11-20T08:00:00.000Z');
  });
});

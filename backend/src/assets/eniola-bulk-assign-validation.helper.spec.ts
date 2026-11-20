import { planBulkAssign } from './eniola-bulk-assign-validation.helper';

describe('eniola-bulk-assign-validation.helper', () => {
  it('fails unknown targets before writes and skips terminal statuses', () => {
    const ctx = {
      existingAssetIds: new Set(['a1', 'a2']),
      existingUserIds: new Set(['u1']),
      existingDepartmentIds: new Set(),
      assetStatuses: { a1: 'AVAILABLE', a2: 'RETIRED' },
    };
    const badUser = planBulkAssign({ ids: ['a1'], userId: 'missing' }, ctx);
    expect(badUser.failed[0].reason).toBe('Unknown userId');
    const plan = planBulkAssign({ ids: ['a1', 'a2'], userId: 'u1' }, ctx);
    expect(plan.assignableIds).toEqual(['a1']);
    expect(plan.failed).toEqual([{ id: 'a2', reason: 'Asset status RETIRED cannot be assigned' }]);
  });
});

import { resolveAssetTransferPath, transferSideEffectsRequired } from './mxllv-asset-transfer-path.helper';

describe('mxllv-asset-transfer-path.helper', () => {
  it('routes non-admins to approval workflow and admins to direct path', () => {
    expect(resolveAssetTransferPath('EMPLOYEE').mode).toBe('REQUEST_APPROVAL');
    expect(resolveAssetTransferPath('ADMIN').mode).toBe('DIRECT');
  });

  it('documents required side effects for both paths', () => {
    expect(transferSideEffectsRequired()).toEqual({ history: true, audit: true });
  });
});

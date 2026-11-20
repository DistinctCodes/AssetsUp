import { assetWriteRoleMatrix, canPerformAssetWrite } from './eniola-asset-write-authorization.helper';

describe('eniola-asset-write-authorization.helper', () => {
  it('denies EMPLOYEE create/update/delete', () => {
    expect(canPerformAssetWrite('EMPLOYEE', 'create')).toBe(false);
    expect(canPerformAssetWrite('EMPLOYEE', 'update')).toBe(false);
    expect(canPerformAssetWrite('EMPLOYEE', 'delete')).toBe(false);
  });

  it('documents role matrix', () => {
    expect(assetWriteRoleMatrix().ADMIN.delete).toBe(true);
    expect(assetWriteRoleMatrix().MANAGER.create).toBe(true);
  });
});

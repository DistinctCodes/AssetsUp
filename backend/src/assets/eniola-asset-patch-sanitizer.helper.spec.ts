import { assertNoProtectedAssetPatchFields, sanitizeAssetPatch } from './eniola-asset-patch-sanitizer.helper';

describe('eniola-asset-patch-sanitizer.helper', () => {
  it('rejects status and assetTag changes in PATCH payload', () => {
    const result = sanitizeAssetPatch({ name: 'X', status: 'DISPOSED', assetTag: 'TAG-1' });
    expect(result.sanitized).toEqual({ name: 'X' });
    expect(result.rejectedFields.sort()).toEqual(['assetTag', 'status']);
    expect(() => assertNoProtectedAssetPatchFields({ status: 'AVAILABLE' })).toThrow('Protected fields');
  });
});

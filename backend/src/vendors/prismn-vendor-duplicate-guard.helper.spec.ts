import { evaluateVendorDuplicate } from './prismn-vendor-duplicate-guard.helper';

describe('prismn-vendor-duplicate-guard.helper', () => {
  it('returns conflict for near-duplicate vendor names', () => {
    const decision = evaluateVendorDuplicate(
      [{ id: 'v1', name: 'Acme Supplies LLC', email: 'sales@acme.com' }],
      { name: 'Acme Supplies', email: 'other@example.com' },
    );
    expect(decision.status).toBe('conflict');
    expect(decision.conflictingVendorId).toBe('v1');
  });

  it('allows when forced by admin', () => {
    const decision = evaluateVendorDuplicate(
      [{ id: 'v1', name: 'Acme Supplies LLC' }],
      { name: 'Acme Supplies' },
      { force: true },
    );
    expect(decision.status).toBe('ok');
  });
});

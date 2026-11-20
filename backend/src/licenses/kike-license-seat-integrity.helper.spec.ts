import { applySeatUnassign, canDeleteLicense } from './kike-license-seat-integrity.helper';

describe('kike-license-seat-integrity.helper', () => {
  it('blocks delete when seats are in use', () => {
    const result = canDeleteLicense(
      { id: 'lic-1', seatsUsed: 1 },
      [{ id: 'as-1', licenseId: 'lic-1', active: true }],
    );
    expect(result.ok).toBe(false);
  });

  it('keeps seatsUsed correct across concurrent-like unassign attempts', () => {
    const license = { id: 'lic-1', seatsUsed: 2 };
    const assignments = [
      { id: 'as-1', licenseId: 'lic-1', active: true },
      { id: 'as-2', licenseId: 'lic-1', active: true },
    ];
    const first = applySeatUnassign(license, assignments, 'as-1');
    expect(first.license.seatsUsed).toBe(1);
    const second = applySeatUnassign(first.license, first.assignments, 'as-1');
    expect(second.changed).toBe(false);
    expect(second.license.seatsUsed).toBe(1);
    const third = applySeatUnassign(second.license, second.assignments, 'as-2');
    expect(third.license.seatsUsed).toBe(0);
  });
});

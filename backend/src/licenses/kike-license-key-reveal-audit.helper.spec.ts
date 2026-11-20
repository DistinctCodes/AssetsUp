import { buildLicenseRevealAudit, canRevealLicenseKey } from './kike-license-key-reveal-audit.helper';

describe('kike-license-key-reveal-audit.helper', () => {
  it('allows only ADMIN and MANAGER to reveal keys', () => {
    expect(canRevealLicenseKey('ADMIN')).toBe(true);
    expect(canRevealLicenseKey('MANAGER')).toBe(true);
    expect(canRevealLicenseKey('EMPLOYEE')).toBe(false);
  });

  it('records audit entry with actor and ip', () => {
    const entry = buildLicenseRevealAudit({
      licenseId: 'lic-1',
      actorId: 'user-9',
      actorRole: 'ADMIN',
      ipAddress: '203.0.113.5',
      now: new Date('2026-11-20T10:00:00Z'),
    });
    expect(entry).toEqual({
      action: 'LICENSE_KEY_REVEALED',
      licenseId: 'lic-1',
      actorId: 'user-9',
      actorRole: 'ADMIN',
      ipAddress: '203.0.113.5',
      revealedAt: '2026-11-20T10:00:00.000Z',
    });
  });
});

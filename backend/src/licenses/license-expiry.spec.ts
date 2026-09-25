import {
  CRITICAL_EXPIRY_DAYS,
  DEFAULT_EXPIRY_WARNING_DAYS,
  buildExpiryMessage,
  buildExpiryNotifications,
  daysUntilExpiry,
  expiryStatus,
  severityFor,
} from './license-expiry';

const NOW = new Date('2026-01-10T00:00:00.000Z');
const options = { now: NOW, warningDays: DEFAULT_EXPIRY_WARNING_DAYS };

function license(id: string, name: string, expiryDate: string | null, isActive = true) {
  return { id, name, expiryDate, isActive };
}

describe('daysUntilExpiry', () => {
  it('counts whole days remaining', () => {
    expect(daysUntilExpiry('2026-01-20T00:00:00.000Z', NOW)).toBe(10);
  });

  it('rounds a partial day up', () => {
    expect(daysUntilExpiry('2026-01-10T12:00:00.000Z', NOW)).toBe(1);
  });

  it('is zero on the expiry day', () => {
    expect(daysUntilExpiry('2026-01-10T00:00:00.000Z', NOW)).toBe(0);
  });

  it('is negative once expired', () => {
    expect(daysUntilExpiry('2026-01-01T00:00:00.000Z', NOW)).toBe(-9);
  });

  it('returns null without a usable date', () => {
    expect(daysUntilExpiry(null, NOW)).toBeNull();
    expect(daysUntilExpiry(undefined, NOW)).toBeNull();
    expect(daysUntilExpiry('not-a-date', NOW)).toBeNull();
  });
});

describe('expiryStatus', () => {
  it('treats a missing expiry as perpetual', () => {
    expect(expiryStatus(null, options)).toBe('PERPETUAL');
  });

  it('flags expired licenses', () => {
    expect(expiryStatus('2026-01-01T00:00:00.000Z', options)).toBe('EXPIRED');
  });

  it('flags licenses inside the warning window', () => {
    expect(expiryStatus('2026-01-20T00:00:00.000Z', options)).toBe('EXPIRING');
  });

  it('leaves healthy licenses active', () => {
    expect(expiryStatus('2026-06-01T00:00:00.000Z', options)).toBe('ACTIVE');
  });

  it('respects a custom warning window', () => {
    expect(expiryStatus('2026-01-20T00:00:00.000Z', { now: NOW, warningDays: 5 })).toBe(
      'ACTIVE',
    );
  });
});

describe('severityFor', () => {
  it('escalates near and past expiry', () => {
    expect(severityFor(-1)).toBe('CRITICAL');
    expect(severityFor(CRITICAL_EXPIRY_DAYS)).toBe('CRITICAL');
    expect(severityFor(8)).toBe('WARNING');
  });
});

describe('buildExpiryMessage', () => {
  it('describes past, present and future expiries', () => {
    expect(buildExpiryMessage('Photoshop', -2)).toBe('Photoshop expired 2 day(s) ago');
    expect(buildExpiryMessage('Photoshop', 0)).toBe('Photoshop expires today');
    expect(buildExpiryMessage('Photoshop', 5)).toBe('Photoshop expires in 5 day(s)');
  });
});

describe('buildExpiryNotifications', () => {
  const licenses = [
    license('l1', 'Perpetual Suite', null),
    license('l2', 'Healthy', '2026-06-01T00:00:00.000Z'),
    license('l3', 'Soon', '2026-01-20T00:00:00.000Z'),
    license('l4', 'Critical', '2026-01-12T00:00:00.000Z'),
    license('l5', 'Expired', '2026-01-01T00:00:00.000Z'),
    license('l6', 'Retired Soon', '2026-01-15T00:00:00.000Z', false),
  ];

  it('notifies only about licenses inside the warning window', () => {
    const ids = buildExpiryNotifications(licenses, options).map((n) => n.licenseId);
    expect(ids).toEqual(['l5', 'l4', 'l3']);
  });

  it('sorts the most urgent first', () => {
    const notifications = buildExpiryNotifications(licenses, options);
    expect(notifications[0].severity).toBe('CRITICAL');
    expect(notifications[notifications.length - 1].licenseId).toBe('l3');
  });

  it('skips perpetual and inactive licenses', () => {
    const ids = buildExpiryNotifications(licenses, options).map((n) => n.licenseId);
    expect(ids).not.toContain('l1');
    expect(ids).not.toContain('l2');
    expect(ids).not.toContain('l6');
  });

  it('produces one notification per license with a readable message', () => {
    const notifications = buildExpiryNotifications(licenses, options);
    expect(notifications).toHaveLength(3);
    expect(notifications[0].message).toContain('expired');
    expect(notifications[2].message).toContain('expires in');
  });

  it('returns nothing when every license is healthy', () => {
    expect(buildExpiryNotifications([license('l1', 'Healthy', '2026-06-01T00:00:00.000Z')], options)).toEqual([]);
  });

  it('handles an empty list', () => {
    expect(buildExpiryNotifications([], options)).toEqual([]);
  });
});

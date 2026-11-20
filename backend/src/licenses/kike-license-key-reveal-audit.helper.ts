export type LicenseActorRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | string;

export interface LicenseRevealAuditEntry {
  action: 'LICENSE_KEY_REVEALED';
  licenseId: string;
  actorId: string;
  actorRole: LicenseActorRole;
  ipAddress: string | null;
  revealedAt: string;
}

export function canRevealLicenseKey(role: LicenseActorRole): boolean {
  return role === 'ADMIN' || role === 'MANAGER';
}

export function buildLicenseRevealAudit(params: {
  licenseId: string;
  actorId: string;
  actorRole: LicenseActorRole;
  ipAddress?: string | null;
  now?: Date;
}): LicenseRevealAuditEntry {
  return {
    action: 'LICENSE_KEY_REVEALED',
    licenseId: params.licenseId,
    actorId: params.actorId,
    actorRole: params.actorRole,
    ipAddress: params.ipAddress ?? null,
    revealedAt: (params.now ?? new Date()).toISOString(),
  };
}

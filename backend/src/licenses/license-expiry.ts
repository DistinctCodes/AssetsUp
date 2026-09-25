export const DEFAULT_EXPIRY_WARNING_DAYS = 30;
export const CRITICAL_EXPIRY_DAYS = 7;

export interface ExpirableLicense {
  id: string;
  name: string;
  expiryDate?: Date | string | null;
  isActive?: boolean;
}

export type ExpirySeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type ExpiryStatus = 'PERPETUAL' | 'EXPIRED' | 'EXPIRING' | 'ACTIVE';

export interface ExpiryNotification {
  licenseId: string;
  licenseName: string;
  daysRemaining: number;
  severity: ExpirySeverity;
  message: string;
}

export interface ExpiryOptions {
  now?: Date;
  warningDays?: number;
}

const MS_PER_DAY = 86_400_000;

function toDate(value: Date | string | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function daysUntilExpiry(
  expiryDate: Date | string | null | undefined,
  now: Date = new Date(),
): number | null {
  const date = toDate(expiryDate);
  if (date === null) return null;
  return Math.ceil((date.getTime() - now.getTime()) / MS_PER_DAY);
}

export function expiryStatus(
  expiryDate: Date | string | null | undefined,
  options: ExpiryOptions = {},
): ExpiryStatus {
  const date = toDate(expiryDate);
  if (date === null) return 'PERPETUAL';
  const days = daysUntilExpiry(date, options.now ?? new Date()) as number;
  if (days < 0) return 'EXPIRED';
  if (days <= (options.warningDays ?? DEFAULT_EXPIRY_WARNING_DAYS)) return 'EXPIRING';
  return 'ACTIVE';
}

export function severityFor(daysRemaining: number): ExpirySeverity {
  if (daysRemaining < 0) return 'CRITICAL';
  if (daysRemaining <= CRITICAL_EXPIRY_DAYS) return 'CRITICAL';
  return 'WARNING';
}

export function buildExpiryMessage(licenseName: string, daysRemaining: number): string {
  if (daysRemaining < 0) return `${licenseName} expired ${Math.abs(daysRemaining)} day(s) ago`;
  if (daysRemaining === 0) return `${licenseName} expires today`;
  return `${licenseName} expires in ${daysRemaining} day(s)`;
}

export function buildExpiryNotifications(
  licenses: ReadonlyArray<ExpirableLicense>,
  options: ExpiryOptions = {},
): ExpiryNotification[] {
  const now = options.now ?? new Date();
  const warningDays = options.warningDays ?? DEFAULT_EXPIRY_WARNING_DAYS;
  const notifications: ExpiryNotification[] = [];

  for (const license of licenses) {
    if (license?.isActive === false) continue;
    const days = daysUntilExpiry(license?.expiryDate, now);
    if (days === null) continue;
    if (days > warningDays) continue;
    notifications.push({
      licenseId: license.id,
      licenseName: license.name,
      daysRemaining: days,
      severity: severityFor(days),
      message: buildExpiryMessage(license.name, days),
    });
  }

  return notifications.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

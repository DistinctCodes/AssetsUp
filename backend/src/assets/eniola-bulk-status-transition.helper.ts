import { AssetStatus } from './asset-lifecycle.service';

export const ENIOLA_BULK_STATUS_ALIASES: Record<string, AssetStatus> = {
  ACTIVE: AssetStatus.AVAILABLE,
  MAINTENANCE: AssetStatus.IN_MAINTENANCE,
};

export const ENIOLA_BULK_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  [AssetStatus.AVAILABLE]: [AssetStatus.ASSIGNED, AssetStatus.IN_MAINTENANCE, AssetStatus.RETIRED],
  [AssetStatus.ASSIGNED]: [AssetStatus.AVAILABLE, AssetStatus.IN_MAINTENANCE],
  [AssetStatus.IN_MAINTENANCE]: [AssetStatus.AVAILABLE, AssetStatus.ASSIGNED],
  [AssetStatus.RETIRED]: [AssetStatus.DISPOSED],
  [AssetStatus.DISPOSED]: [],
  [AssetStatus.LOST]: [],
};

export function normalizeBulkStatus(status: string): AssetStatus | null {
  if (!status) return null;
  const upper = String(status).toUpperCase();
  if ((Object.values(AssetStatus) as string[]).includes(upper)) return upper as AssetStatus;
  return ENIOLA_BULK_STATUS_ALIASES[upper] ?? null;
}

export function canTransitionBulkStatus(from: string, to: string): boolean {
  const allowed = ENIOLA_BULK_ALLOWED_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

export function validateBulkStatusUpdate(currentStatus: string, requestedStatus: string): { ok: boolean; normalized?: AssetStatus; reason?: string } {
  const normalized = normalizeBulkStatus(requestedStatus);
  if (!normalized) return { ok: false, reason: 'Unknown target status' };
  if (!canTransitionBulkStatus(currentStatus, normalized)) {
    return { ok: false, normalized, reason: `Cannot transition ${currentStatus} to ${normalized}` };
  }
  return { ok: true, normalized };
}

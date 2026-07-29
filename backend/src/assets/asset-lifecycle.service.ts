import { Injectable, BadRequestException } from '@nestjs/common';

export enum AssetStatus {
  AVAILABLE = 'AVAILABLE',
  ASSIGNED = 'ASSIGNED',
  IN_MAINTENANCE = 'IN_MAINTENANCE',
  IN_TRANSIT = 'IN_TRANSIT',
  RETIRED = 'RETIRED',
  DISPOSED = 'DISPOSED',
  LOST = 'LOST',
}

/**
 * Status values accepted on the wire: the canonical statuses plus the aliases
 * the frontend AssetStatus enum uses (ACTIVE, MAINTENANCE).
 */
export enum AssetStatusInput {
  AVAILABLE = 'AVAILABLE',
  ACTIVE = 'ACTIVE',
  ASSIGNED = 'ASSIGNED',
  IN_MAINTENANCE = 'IN_MAINTENANCE',
  MAINTENANCE = 'MAINTENANCE',
  IN_TRANSIT = 'IN_TRANSIT',
  RETIRED = 'RETIRED',
  DISPOSED = 'DISPOSED',
  LOST = 'LOST',
}

const STATUS_ALIASES: Record<string, AssetStatus> = {
  ACTIVE: AssetStatus.AVAILABLE,
  MAINTENANCE: AssetStatus.IN_MAINTENANCE,
};

const ALLOWED_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  [AssetStatus.AVAILABLE]: [
    AssetStatus.ASSIGNED,
    AssetStatus.IN_MAINTENANCE,
    AssetStatus.IN_TRANSIT,
    AssetStatus.RETIRED,
    AssetStatus.LOST,
  ],
  [AssetStatus.ASSIGNED]: [
    AssetStatus.AVAILABLE,
    AssetStatus.IN_MAINTENANCE,
    AssetStatus.IN_TRANSIT,
    AssetStatus.RETIRED,
    AssetStatus.LOST,
  ],
  [AssetStatus.IN_MAINTENANCE]: [
    AssetStatus.AVAILABLE,
    AssetStatus.ASSIGNED,
    AssetStatus.RETIRED,
  ],
  [AssetStatus.IN_TRANSIT]: [
    AssetStatus.AVAILABLE,
    AssetStatus.ASSIGNED,
    AssetStatus.LOST,
  ],
  [AssetStatus.RETIRED]: [AssetStatus.DISPOSED],
  [AssetStatus.DISPOSED]: [],
  [AssetStatus.LOST]: [
    AssetStatus.AVAILABLE,
    AssetStatus.RETIRED,
    AssetStatus.DISPOSED,
  ],
};

@Injectable()
export class AssetLifecycleService {
  private history = new Map<string, any[]>();

  /**
   * Resolve a wire status value to its canonical AssetStatus, rejecting anything
   * outside the enum with a 400.
   */
  normalizeStatus(status: string): AssetStatus {
    if (!status) {
      throw new BadRequestException('status is required');
    }
    const upper = String(status).toUpperCase();
    const resolved = STATUS_ALIASES[upper] ?? (upper as AssetStatus);
    if (!Object.values(AssetStatus).includes(resolved)) {
      throw new BadRequestException(
        `Invalid asset status "${status}". Allowed values: ${Object.values(AssetStatusInput).join(', ')}`,
      );
    }
    return resolved;
  }

  validateTransition(fromStatus: AssetStatus, toStatus: AssetStatus) {
    if (fromStatus === toStatus) return true;
    const allowed = ALLOWED_TRANSITIONS[fromStatus] || [];
    if (!allowed.includes(toStatus)) {
      throw new BadRequestException(
        `Cannot transition asset status from ${fromStatus} to ${toStatus}`,
      );
    }
    return true;
  }

  recordHistory(
    assetId: string,
    event: {
      eventType: string;
      actorUserId: string;
      note?: string;
      fieldChanges?: any;
    },
  ) {
    const list = this.history.get(assetId) || [];
    const entry = {
      id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      assetId,
      ...event,
      timestamp: new Date(),
    };
    list.unshift(entry);
    this.history.set(assetId, list);
    return entry;
  }

  getHistory(assetId: string) {
    return this.history.get(assetId) || [];
  }
}

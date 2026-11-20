export type LedgerMovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

export interface InventoryMovementRecord {
  id: string;
  inventoryItemId: string;
  type: LedgerMovementType;
  quantity: number;
  previousQuantity: number;
  nextQuantity: number;
  actorUserId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface MovementLedger {
  movements: InventoryMovementRecord[];
}

export function recordInventoryMovement(
  ledger: MovementLedger,
  params: {
    id: string;
    inventoryItemId: string;
    type: LedgerMovementType;
    quantity: number;
    previousQuantity: number;
    nextQuantity: number;
    actorUserId?: string | null;
    reason?: string | null;
    now?: Date;
  },
): InventoryMovementRecord {
  const record: InventoryMovementRecord = {
    id: params.id,
    inventoryItemId: params.inventoryItemId,
    type: params.type,
    quantity: params.quantity,
    previousQuantity: params.previousQuantity,
    nextQuantity: params.nextQuantity,
    actorUserId: params.actorUserId ?? null,
    reason: params.reason ?? null,
    createdAt: (params.now ?? new Date()).toISOString(),
  };
  ledger.movements.push(record);
  return record;
}

export function listInventoryMovements(
  ledger: MovementLedger,
  inventoryItemId: string,
  page = 1,
  limit = 20,
): { items: InventoryMovementRecord[]; total: number; page: number; limit: number } {
  const all = ledger.movements
    .filter((m) => m.inventoryItemId === inventoryItemId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const start = (Math.max(1, page) - 1) * limit;
  return { items: all.slice(start, start + limit), total: all.length, page, limit };
}

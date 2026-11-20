export interface PoLineDraft {
  description: string;
  quantity: number;
  unitCostMinor: number;
  sku?: string | null;
}

export interface PoDraft {
  vendorId: string;
  requestedByUserId: string;
  notes?: string | null;
  lineItems: PoLineDraft[];
}

export interface PoPersistPlan {
  purchaseOrder: {
    vendorId: string;
    requestedByUserId: string;
    notes: string | null;
    totalAmountMinor: number;
  };
  lineItems: Array<PoLineDraft & { lineTotalMinor: number }>;
}

export function toMinorUnits(value: number | string): number {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) throw new Error('Invalid money value');
  return Math.round(n * 100);
}

export function sumMinorUnits(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0);
}

export function buildTransactionalPoPersistPlan(draft: PoDraft): PoPersistPlan {
  if (!Array.isArray(draft.lineItems)) throw new Error('lineItems required');
  const lineItems = draft.lineItems.map((li) => {
    if (!Number.isInteger(li.quantity) || li.quantity <= 0) throw new Error('quantity must be a positive integer');
    if (!Number.isInteger(li.unitCostMinor) || li.unitCostMinor < 0) throw new Error('unitCostMinor must be a non-negative integer');
    return { ...li, sku: li.sku ?? null, lineTotalMinor: li.quantity * li.unitCostMinor };
  });
  const totalAmountMinor = sumMinorUnits(lineItems.map((li) => li.lineTotalMinor));
  return {
    purchaseOrder: {
      vendorId: draft.vendorId,
      requestedByUserId: draft.requestedByUserId,
      notes: draft.notes ?? null,
      totalAmountMinor,
    },
    lineItems,
  };
}

export function applyTransactionalLineItemReplace<T extends { id: string }>(
  existing: T[],
  replacements: T[],
): { toDelete: T[]; toInsert: T[] } {
  return { toDelete: [...existing], toInsert: [...replacements] };
}

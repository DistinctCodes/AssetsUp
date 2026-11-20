import { PurchaseOrderStatus } from './purchase-order-transitions';

export type PoLineItemKind = 'ASSET' | 'CONSUMABLE';

export interface PoLineItem {
  id: string;
  description: string;
  quantity: number;
  receivedQuantity?: number;
  unitCostMinor: number;
  kind: PoLineItemKind;
  assetCategoryId?: string | null;
  inventoryItemId?: string | null;
}

export interface ReceiveLineInput {
  lineItemId: string;
  receivedQuantity: number;
}

export interface ReceivePoInput {
  lineItems: ReceiveLineInput[];
}

export interface PlannedAssetCreation {
  lineItemId: string;
  description: string;
  quantity: number;
  unitCostMinor: number;
  vendorId?: string | null;
  purchaseOrderId: string;
  assetCategoryId?: string | null;
}

export interface PlannedStockMovement {
  lineItemId: string;
  inventoryItemId: string;
  type: 'IN';
  quantity: number;
  reference: string;
}

export interface ReceivePoPlan {
  status: PurchaseOrderStatus;
  lineUpdates: Array<{ lineItemId: string; receivedQuantity: number }>;
  assetsToCreate: PlannedAssetCreation[];
  stockMovements: PlannedStockMovement[];
}

export function planPurchaseOrderReceipt(params: {
  purchaseOrderId: string;
  vendorId?: string | null;
  lineItems: PoLineItem[];
  receipt: ReceivePoInput;
}): ReceivePoPlan {
  const byId = new Map(params.lineItems.map((li) => [li.id, li]));
  const lineUpdates: ReceivePoPlan['lineUpdates'] = [];
  const assetsToCreate: PlannedAssetCreation[] = [];
  const stockMovements: PlannedStockMovement[] = [];

  for (const input of params.receipt.lineItems) {
    if (!Number.isInteger(input.receivedQuantity) || input.receivedQuantity < 0) {
      throw new Error(`Invalid received quantity for ${input.lineItemId}`);
    }
    const li = byId.get(input.lineItemId);
    if (!li) throw new Error(`Unknown line item ${input.lineItemId}`);
    const previous = li.receivedQuantity ?? 0;
    const nextReceived = previous + input.receivedQuantity;
    if (nextReceived > li.quantity) {
      throw new Error(`Received quantity exceeds ordered quantity for ${input.lineItemId}`);
    }
    lineUpdates.push({ lineItemId: li.id, receivedQuantity: nextReceived });
    if (input.receivedQuantity > 0 && li.kind === 'ASSET') {
      assetsToCreate.push({
        lineItemId: li.id,
        description: li.description,
        quantity: input.receivedQuantity,
        unitCostMinor: li.unitCostMinor,
        vendorId: params.vendorId ?? null,
        purchaseOrderId: params.purchaseOrderId,
        assetCategoryId: li.assetCategoryId ?? null,
      });
    }
    if (input.receivedQuantity > 0 && li.kind === 'CONSUMABLE' && li.inventoryItemId) {
      stockMovements.push({
        lineItemId: li.id,
        inventoryItemId: li.inventoryItemId,
        type: 'IN',
        quantity: input.receivedQuantity,
        reference: `PO:${params.purchaseOrderId}`,
      });
    }
  }

  const allReceived = params.lineItems.every((li) => {
    const update = lineUpdates.find((u) => u.lineItemId === li.id);
    const qty = update ? update.receivedQuantity : (li.receivedQuantity ?? 0);
    return qty >= li.quantity;
  });

  return {
    status: allReceived ? 'RECEIVED' : ('PARTIALLY_RECEIVED' as PurchaseOrderStatus),
    lineUpdates,
    assetsToCreate,
    stockMovements,
  };
}

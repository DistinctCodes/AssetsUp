export const PRISMN_OPEN_PURCHASE_ORDER_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED'] as const;
export type PrismnPoStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'RECEIVED' | 'CANCELLED' | string;

export interface VendorPurchaseOrderRef {
  id: string;
  vendorId: string;
  poNumber?: string;
  status: PrismnPoStatus;
}

export function isPrismnOpenPurchaseOrder(status: PrismnPoStatus): boolean {
  return (PRISMN_OPEN_PURCHASE_ORDER_STATUSES as readonly string[]).includes(status);
}

export function findBlockingPurchaseOrderForVendorDelete(
  orders: ReadonlyArray<VendorPurchaseOrderRef>,
  vendorId: string,
): VendorPurchaseOrderRef | null {
  return orders.find((po) => po.vendorId === vendorId && isPrismnOpenPurchaseOrder(po.status)) ?? null;
}

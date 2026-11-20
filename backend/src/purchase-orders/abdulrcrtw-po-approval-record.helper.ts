export interface PurchaseOrderApprovalFields {
  createdByUserId: string;
  approvedByUserId: string;
  approvedAt: string;
}

export function buildPurchaseOrderApprovalFields(params: {
  createdByUserId: string;
  approverUserId: string;
  now?: Date;
}): PurchaseOrderApprovalFields {
  if (!params.createdByUserId) throw new Error('createdByUserId is required');
  if (!params.approverUserId) throw new Error('approverUserId is required');
  return {
    createdByUserId: params.createdByUserId,
    approvedByUserId: params.approverUserId,
    approvedAt: (params.now ?? new Date()).toISOString(),
  };
}

export function applyPurchaseOrderApproval<T extends { createdByUserId: string }>(
  po: T,
  approverUserId: string,
  now?: Date,
): T & { approvedByUserId: string; approvedAt: string } {
  const fields = buildPurchaseOrderApprovalFields({
    createdByUserId: po.createdByUserId,
    approverUserId,
    now,
  });
  return { ...po, ...fields };
}

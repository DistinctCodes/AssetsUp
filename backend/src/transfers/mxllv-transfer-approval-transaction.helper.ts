export type TransferStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
export type TransferAssetStatus = 'AVAILABLE' | 'ASSIGNED' | 'IN_MAINTENANCE' | 'RETIRED' | 'DISPOSED' | 'LOST' | string;

export interface TransferRecord {
  id: string;
  assetId: string;
  status: TransferStatus;
  fromDepartmentId?: string | null;
  toDepartmentId?: string | null;
}

export interface AssetRecord {
  id: string;
  status: TransferAssetStatus;
  departmentId?: string | null;
}

export interface TransferApprovalTxPlan {
  ok: boolean;
  reason?: string;
  transfer?: TransferRecord & { status: 'APPROVED' };
  asset?: AssetRecord;
  historyEvent?: { type: 'TRANSFERRED'; assetId: string; fromDepartmentId: string | null; toDepartmentId: string | null };
}

export function planTransferApprovalTx(params: {
  transfer: TransferRecord;
  asset: AssetRecord;
  expectedStatus?: TransferStatus;
}): TransferApprovalTxPlan {
  const expected = params.expectedStatus ?? 'PENDING';
  if (params.transfer.status !== expected) {
    return { ok: false, reason: `Transfer is ${params.transfer.status}, expected ${expected}` };
  }
  if (params.asset.status === 'DISPOSED' || params.asset.status === 'LOST') {
    return { ok: false, reason: `Asset in status ${params.asset.status} cannot be transferred` };
  }
  const nextTransfer: TransferRecord & { status: 'APPROVED' } = { ...params.transfer, status: 'APPROVED' };
  const nextAsset: AssetRecord = {
    ...params.asset,
    departmentId: params.transfer.toDepartmentId ?? params.asset.departmentId ?? null,
  };
  return {
    ok: true,
    transfer: nextTransfer,
    asset: nextAsset,
    historyEvent: {
      type: 'TRANSFERRED',
      assetId: params.asset.id,
      fromDepartmentId: params.transfer.fromDepartmentId ?? null,
      toDepartmentId: params.transfer.toDepartmentId ?? null,
    },
  };
}

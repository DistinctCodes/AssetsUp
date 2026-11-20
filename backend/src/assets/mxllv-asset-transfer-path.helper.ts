export type AssetTransferMode = 'DIRECT' | 'REQUEST_APPROVAL';
export type ActorRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | string;

export interface TransferPathDecision {
  mode: AssetTransferMode;
  reason: string;
}

export function resolveAssetTransferPath(role: ActorRole): TransferPathDecision {
  if (role === 'ADMIN' || role === 'MANAGER') {
    return {
      mode: 'DIRECT',
      reason: 'Admins/managers may transfer directly; action must record history and audit.',
    };
  }
  return {
    mode: 'REQUEST_APPROVAL',
    reason: 'Non-admin users must create a pending transfer request for approval workflow.',
  };
}

export function transferSideEffectsRequired(): { history: boolean; audit: boolean } {
  return { history: true, audit: true };
}

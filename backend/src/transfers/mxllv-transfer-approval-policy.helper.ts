import { evaluateApproval, assertTransition, ApprovalContext } from './transfer-approval';

export type TransferActorRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | string;

export interface TransferApprovalPolicyInput extends ApprovalContext {
  approverRole: TransferActorRole;
}

export function canApproveTransferPolicy(input: TransferApprovalPolicyInput): { allowed: boolean; reason: string | null } {
  if (input.approverRole !== 'ADMIN' && input.approverRole !== 'MANAGER') {
    return { allowed: false, reason: 'Only ADMIN or MANAGER may approve transfers' };
  }
  if (!canTransition(input.status, 'APPROVED')) {
    return { allowed: false, reason: `Transfer cannot transition from ${input.status} to APPROVED` };
  }
  const decision = evaluateApproval({
    status: input.status,
    requestedByUserId: input.requestedByUserId,
    approverUserId: input.approverUserId,
  });
  return decision;
}

export function canRejectTransferPolicy(input: TransferApprovalPolicyInput): { allowed: boolean; reason: string | null } {
  if (input.approverRole !== 'ADMIN' && input.approverRole !== 'MANAGER') {
    return { allowed: false, reason: 'Only ADMIN or MANAGER may reject transfers' };
  }
  try {
    assertTransition(input.status, 'REJECTED');
    return { allowed: true, reason: null };
  } catch (e) {
    return { allowed: false, reason: (e as Error).message };
  }
}

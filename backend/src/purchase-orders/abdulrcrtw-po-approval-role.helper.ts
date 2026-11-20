export type PoApprovalRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | string;

export interface PoApprovalRoleContext {
  creatorUserId: string;
  approverUserId: string;
  approverRole: PoApprovalRole;
}

export interface PoApprovalRoleDecision {
  allowed: boolean;
  reason?: string;
}

export function canApprovePurchaseOrder(ctx: PoApprovalRoleContext): PoApprovalRoleDecision {
  if (ctx.approverRole !== 'ADMIN' && ctx.approverRole !== 'MANAGER') {
    return { allowed: false, reason: 'Only ADMIN or MANAGER may approve purchase orders' };
  }
  if (ctx.creatorUserId === ctx.approverUserId) {
    return { allowed: false, reason: 'Creator cannot approve their own purchase order' };
  }
  return { allowed: true };
}

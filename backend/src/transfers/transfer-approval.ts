export const TRANSFER_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
  'CANCELLED',
] as const;

export type TransferStatusValue = (typeof TRANSFER_STATUSES)[number];

export const TRANSFER_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  PENDING: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['COMPLETED', 'CANCELLED'],
  REJECTED: [],
  COMPLETED: [],
  CANCELLED: [],
};

export interface ApprovalContext {
  status: string;
  requestedByUserId: string;
  approverUserId: string;
}

export interface ApprovalDecision {
  allowed: boolean;
  reason: string | null;
}

export function allowedTransitions(status: string): readonly string[] {
  return TRANSFER_TRANSITIONS[status] ?? [];
}

export function isPending(status: string): boolean {
  return status === 'PENDING';
}

export function canTransition(from: string, to: string): boolean {
  return allowedTransitions(from).includes(to);
}

export function describeIllegalTransition(from: string, to: string): string {
  if (from === to) {
    return `Transfer is already ${to} and cannot repeat that step`;
  }
  const allowed = allowedTransitions(from);
  if (allowed.length === 0) return `Transfer is ${from} and is final`;
  return `Cannot move transfer from ${from} to ${to}. Allowed: ${allowed.join(', ')}`;
}

export function assertTransition(from: string, to: string): void {
  if (!canTransition(from, to)) throw new Error(describeIllegalTransition(from, to));
}

export function evaluateApproval(context: ApprovalContext): ApprovalDecision {
  if (!canTransition(context.status, 'APPROVED')) {
    return { allowed: false, reason: describeIllegalTransition(context.status, 'APPROVED') };
  }
  if (!context.approverUserId) {
    return { allowed: false, reason: 'An approver is required before a transfer can be approved' };
  }
  if (context.approverUserId === context.requestedByUserId) {
    return { allowed: false, reason: 'Transfers cannot be approved by the requesting user' };
  }
  return { allowed: true, reason: null };
}

export function assertCanApprove(context: ApprovalContext): void {
  const decision = evaluateApproval(context);
  if (!decision.allowed) throw new Error(decision.reason);
}

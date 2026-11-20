import {
  assertTransition,
  canTransition,
  describeIllegalTransition,
  PurchaseOrderStatus,
} from './purchase-order-transitions';

export type PrismnPoAction = 'submit' | 'approve' | 'receive' | 'cancel';

const TARGET_BY_ACTION: Record<PrismnPoAction, PurchaseOrderStatus> = {
  submit: 'SUBMITTED',
  approve: 'APPROVED',
  receive: 'RECEIVED',
  cancel: 'CANCELLED',
};

export function transitionTarget(action: PrismnPoAction): PurchaseOrderStatus {
  return TARGET_BY_ACTION[action];
}

export function validatePurchaseOrderAction(from: string, action: PrismnPoAction): void {
  assertTransition(from, transitionTarget(action));
}

export function explainPurchaseOrderAction(from: string, action: PrismnPoAction): string {
  const to = transitionTarget(action);
  if (canTransition(from, to)) return '';
  return describeIllegalTransition(from, to);
}

export const PURCHASE_ORDER_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'RECEIVED',
  'CANCELLED',
] as const;

export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export const PURCHASE_ORDER_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['APPROVED', 'CANCELLED'],
  APPROVED: ['RECEIVED'],
  RECEIVED: [],
  CANCELLED: [],
};

export function isKnownPurchaseOrderStatus(status: unknown): boolean {
  return (
    typeof status === 'string' &&
    (PURCHASE_ORDER_STATUSES as readonly string[]).includes(status)
  );
}

export function allowedTransitions(status: string): readonly string[] {
  return PURCHASE_ORDER_TRANSITIONS[status] ?? [];
}

export function isTerminalStatus(status: string): boolean {
  return allowedTransitions(status).length === 0;
}

export function canTransition(from: string, to: string): boolean {
  return allowedTransitions(from).includes(to);
}

export function isAlreadyInStatus(status: string, target: string): boolean {
  return status === target;
}

export function describeIllegalTransition(from: string, to: string): string {
  if (isAlreadyInStatus(from, to)) {
    return `Purchase order is already ${to} and cannot be ${to.toLowerCase()} again`;
  }
  if (isTerminalStatus(from)) {
    return `Purchase order is ${from} and cannot transition to ${to}`;
  }
  const allowed = allowedTransitions(from);
  const hint = allowed.length > 0 ? ` Allowed: ${allowed.join(', ')}.` : '';
  return `Cannot transition purchase order from ${from} to ${to}.${hint}`;
}

export function assertTransition(from: string, to: string): void {
  if (!canTransition(from, to)) {
    throw new Error(describeIllegalTransition(from, to));
  }
}

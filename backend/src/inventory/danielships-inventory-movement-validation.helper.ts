export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

export interface MovementRequest {
  type: MovementType;
  quantity: number;
  reason?: string;
  actorUserId?: string;
}

export interface MovementValidationError {
  field: string;
  message: string;
}

export function validateMovementRequest(input: Partial<MovementRequest>): MovementValidationError[] {
  const errors: MovementValidationError[] = [];
  if (input.type !== 'IN' && input.type !== 'OUT' && input.type !== 'ADJUSTMENT') {
    errors.push({ field: 'type', message: 'type must be IN, OUT, or ADJUSTMENT' });
  }
  if (typeof input.quantity !== 'number' || !Number.isInteger(input.quantity)) {
    errors.push({ field: 'quantity', message: 'quantity must be an integer' });
  } else if (input.type === 'ADJUSTMENT') {
    // adjustment can be negative or positive non-zero
    if (input.quantity === 0) errors.push({ field: 'quantity', message: 'quantity must be non-zero for ADJUSTMENT' });
  } else if (input.quantity < 1) {
    errors.push({ field: 'quantity', message: 'quantity must be >= 1 for IN/OUT' });
  }
  if (input.actorUserId !== undefined && typeof input.actorUserId !== 'string') {
    errors.push({ field: 'actorUserId', message: 'actorUserId must be a string' });
  }
  return errors;
}

export function movementDelta(type: MovementType, quantity: number): number {
  if (type === 'IN') return quantity;
  if (type === 'OUT') return -quantity;
  return quantity; // adjustment signed
}

export function applyMovementAtomically(currentQuantity: number, delta: number): { ok: boolean; nextQuantity?: number; reason?: string } {
  const next = currentQuantity + delta;
  if (next < 0) return { ok: false, reason: 'Insufficient stock' };
  return { ok: true, nextQuantity: next };
}

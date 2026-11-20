import { api } from '../api';
import type { PageParams, Paginated } from './paginated';

/** Mirrors backend/src/purchase-orders/purchase-order-transitions.ts. */
export enum POStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

/** The same transition table the backend enforces; the UI only offers moves listed here. */
export const PO_TRANSITIONS: Readonly<Record<POStatus, readonly POStatus[]>> = {
  [POStatus.DRAFT]: [POStatus.SUBMITTED, POStatus.CANCELLED],
  [POStatus.SUBMITTED]: [POStatus.APPROVED, POStatus.CANCELLED],
  [POStatus.APPROVED]: [POStatus.RECEIVED],
  [POStatus.RECEIVED]: [],
  [POStatus.CANCELLED]: [],
};

export type POAction = 'submit' | 'approve' | 'receive' | 'cancel';

/** Which action moves a purchase order into each status. */
const ACTION_FOR_TARGET: Partial<Record<POStatus, POAction>> = {
  [POStatus.SUBMITTED]: 'submit',
  [POStatus.APPROVED]: 'approve',
  [POStatus.RECEIVED]: 'receive',
  [POStatus.CANCELLED]: 'cancel',
};

/** Roles that may approve a purchase order. */
const APPROVER_ROLES = ['ADMIN', 'MANAGER'];

/**
 * The actions to show for a purchase order, driven by the allowed transitions
 * (and by role for approval) rather than by hard-coded status checks.
 */
export function availablePOActions(status: POStatus, role?: string): POAction[] {
  const actions = (PO_TRANSITIONS[status] ?? [])
    .map((target) => ACTION_FOR_TARGET[target])
    .filter((action): action is POAction => !!action);
  return actions.filter(
    (action) => action !== 'approve' || APPROVER_ROLES.includes(role ?? ''),
  );
}

export interface POLineItem {
  id?: string;
  description: string;
  category?: string;
  quantity: number;
  unitPrice: number;
  receivedQuantity?: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId?: string;
  vendor?: { id: string; name: string };
  lineItems: POLineItem[];
  totalAmount: number;
  status: POStatus;
  currency: string;
  expectedDate?: string;
  createdByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePOInput {
  vendorId: string;
  lineItems: Array<{ description: string; category?: string; quantity: number; unitPrice: number }>;
  expectedDate?: string;
}

export interface ReceiveLineInput {
  lineItemId: string;
  receivedQuantity: number;
}

export const poApiClient = {
  getPOs: (params?: PageParams): Promise<Paginated<PurchaseOrder>> =>
    api.get<Paginated<PurchaseOrder>>('/purchase-orders', { params }).then((r) => r.data),

  getPO: (id: string): Promise<PurchaseOrder> =>
    api.get<PurchaseOrder>(`/purchase-orders/${id}`).then((r) => r.data),

  createPO: (data: CreatePOInput): Promise<PurchaseOrder> =>
    api.post<PurchaseOrder>('/purchase-orders', data).then((r) => r.data),

  receiveLineItems: (id: string, items: ReceiveLineInput[]): Promise<PurchaseOrder> =>
    api.post<PurchaseOrder>(`/purchase-orders/${id}/receive`, { items }).then((r) => r.data),

  submitPO: (id: string): Promise<PurchaseOrder> =>
    api.post<PurchaseOrder>(`/purchase-orders/${id}/submit`).then((r) => r.data),

  approvePO: (id: string): Promise<PurchaseOrder> =>
    api.post<PurchaseOrder>(`/purchase-orders/${id}/approve`).then((r) => r.data),

  cancelPO: (id: string): Promise<PurchaseOrder> =>
    api.post<PurchaseOrder>(`/purchase-orders/${id}/cancel`).then((r) => r.data),
};

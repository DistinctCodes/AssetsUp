import { api } from '../api';

export enum POStatus {
  DRAFT = 'DRAFT',
  ORDERED = 'ORDERED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
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
  getPOs: (): Promise<PurchaseOrder[]> =>
    api.get<PurchaseOrder[]>('/purchase-orders').then((r) => r.data),

  getPO: (id: string): Promise<PurchaseOrder> =>
    api.get<PurchaseOrder>(`/purchase-orders/${id}`).then((r) => r.data),

  createPO: (data: CreatePOInput): Promise<PurchaseOrder> =>
    api.post<PurchaseOrder>('/purchase-orders', data).then((r) => r.data),

  receiveLineItems: (id: string, items: ReceiveLineInput[]): Promise<PurchaseOrder> =>
    api.post<PurchaseOrder>(`/purchase-orders/${id}/receive`, { items }).then((r) => r.data),

  cancelPO: (id: string): Promise<PurchaseOrder> =>
    api.patch<PurchaseOrder>(`/purchase-orders/${id}/cancel`).then((r) => r.data),
};

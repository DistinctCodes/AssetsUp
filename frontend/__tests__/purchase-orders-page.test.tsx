import { render, screen, fireEvent } from '@testing-library/react';
import type { PurchaseOrder } from '@/lib/api/purchase-orders';
import { POStatus } from '@/lib/api/purchase-orders';

const submit = jest.fn();
const approve = jest.fn();
let orders: PurchaseOrder[] = [];
let role = 'ADMIN';

jest.mock('@/lib/query/hooks/usePurchaseOrders', () => ({
  usePurchaseOrders: () => ({ data: orders, isLoading: false }),
  useCancelPO: () => ({ mutateAsync: jest.fn() }),
  useSubmitPO: () => ({ mutate: submit, isPending: false }),
  useApprovePO: () => ({ mutate: approve, isPending: false }),
}));
jest.mock('@/store/auth.store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ user: { role } }),
}));
jest.mock('@/components/purchase-orders/create-po-modal', () => ({ CreatePOModal: () => null }));
jest.mock('@/components/purchase-orders/receive-modal', () => ({
  ReceiveModal: () => <div>receive modal</div>,
}));

import PurchaseOrdersPage from '@/app/(dashboard)/purchase-orders/page';

const po = (status: POStatus): PurchaseOrder => ({
  id: 'po-1',
  poNumber: 'PO-001',
  lineItems: [],
  totalAmount: 100,
  status,
  currency: 'USD',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
});

beforeEach(() => {
  jest.clearAllMocks();
  role = 'ADMIN';
});

describe('Purchase orders page actions', () => {
  it('shows Receive for an APPROVED order and opens the receive modal', () => {
    orders = [po(POStatus.APPROVED)];
    render(<PurchaseOrdersPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Receive' }));
    expect(screen.getByText('receive modal')).toBeInTheDocument();
  });

  it('lets a draft be submitted', () => {
    orders = [po(POStatus.DRAFT)];
    render(<PurchaseOrdersPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(submit).toHaveBeenCalledWith('po-1');
  });

  it('lets an admin approve a submitted order', () => {
    orders = [po(POStatus.SUBMITTED)];
    render(<PurchaseOrdersPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(approve).toHaveBeenCalledWith('po-1');
  });

  it('hides Approve from a regular employee', () => {
    role = 'EMPLOYEE';
    orders = [po(POStatus.SUBMITTED)];
    render(<PurchaseOrdersPage />);
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('shows no Receive button before approval', () => {
    orders = [po(POStatus.SUBMITTED)];
    render(<PurchaseOrdersPage />);
    expect(screen.queryByRole('button', { name: 'Receive' })).not.toBeInTheDocument();
  });

  it('colours and labels SUBMITTED and APPROVED orders', () => {
    orders = [po(POStatus.SUBMITTED)];
    const { rerender } = render(<PurchaseOrdersPage />);
    expect(screen.getByText('SUBMITTED').className).toContain('bg-blue-100');
    orders = [po(POStatus.APPROVED)];
    rerender(<PurchaseOrdersPage />);
    expect(screen.getByText('APPROVED').className).toContain('bg-indigo-100');
  });
});

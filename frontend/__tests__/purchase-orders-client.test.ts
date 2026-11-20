import { api } from '@/lib/api';
import {
  POStatus,
  PO_TRANSITIONS,
  availablePOActions,
  poApiClient,
} from '@/lib/api/purchase-orders';

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

const mocked = api as jest.Mocked<typeof api>;

beforeEach(() => {
  jest.clearAllMocks();
  mocked.post.mockResolvedValue({ data: {} } as never);
});

describe('poApiClient routes', () => {
  it('submits with POST /purchase-orders/:id/submit', async () => {
    await poApiClient.submitPO('po-1');
    expect(mocked.post).toHaveBeenCalledWith('/purchase-orders/po-1/submit');
  });

  it('approves with POST /purchase-orders/:id/approve', async () => {
    await poApiClient.approvePO('po-1');
    expect(mocked.post).toHaveBeenCalledWith('/purchase-orders/po-1/approve');
  });

  it('cancels with POST, not PATCH', async () => {
    await poApiClient.cancelPO('po-1');
    expect(mocked.post).toHaveBeenCalledWith('/purchase-orders/po-1/cancel');
    expect(mocked.patch).not.toHaveBeenCalled();
  });
});

describe('POStatus', () => {
  it('matches the backend statuses exactly', () => {
    expect(Object.values(POStatus).sort()).toEqual(
      ['APPROVED', 'CANCELLED', 'DRAFT', 'RECEIVED', 'SUBMITTED'],
    );
  });

  it('has no leftover ORDERED or PARTIALLY_RECEIVED values', () => {
    expect(Object.values(POStatus)).not.toContain('ORDERED');
    expect(Object.values(POStatus)).not.toContain('PARTIALLY_RECEIVED');
  });

  it('uses the backend transition table', () => {
    expect(PO_TRANSITIONS).toEqual({
      DRAFT: ['SUBMITTED', 'CANCELLED'],
      SUBMITTED: ['APPROVED', 'CANCELLED'],
      APPROVED: ['RECEIVED'],
      RECEIVED: [],
      CANCELLED: [],
    });
  });
});

describe('availablePOActions', () => {
  it('offers submit and cancel for a draft', () => {
    expect(availablePOActions(POStatus.DRAFT, 'EMPLOYEE')).toEqual(['submit', 'cancel']);
  });

  it('offers approve to admins and managers only', () => {
    expect(availablePOActions(POStatus.SUBMITTED, 'ADMIN')).toEqual(['approve', 'cancel']);
    expect(availablePOActions(POStatus.SUBMITTED, 'MANAGER')).toEqual(['approve', 'cancel']);
    expect(availablePOActions(POStatus.SUBMITTED, 'EMPLOYEE')).toEqual(['cancel']);
    expect(availablePOActions(POStatus.SUBMITTED)).toEqual(['cancel']);
  });

  it('offers receive for an approved order', () => {
    expect(availablePOActions(POStatus.APPROVED, 'EMPLOYEE')).toEqual(['receive']);
  });

  it.each([POStatus.RECEIVED, POStatus.CANCELLED])('offers nothing for %s', (status) => {
    expect(availablePOActions(status, 'ADMIN')).toEqual([]);
  });

  it('walks DRAFT -> SUBMITTED -> APPROVED -> RECEIVED', () => {
    const path = [POStatus.DRAFT, POStatus.SUBMITTED, POStatus.APPROVED, POStatus.RECEIVED];
    for (let i = 0; i < path.length - 1; i++) {
      expect(PO_TRANSITIONS[path[i]]).toContain(path[i + 1]);
    }
  });
});

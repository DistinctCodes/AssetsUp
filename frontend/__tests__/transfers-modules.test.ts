import { existsSync } from 'node:fs';
import path from 'node:path';
import { api } from '@/lib/api';
import { TransferStatus, transferApiClient } from '@/lib/api/transfers';
import { notificationsApiClient } from '@/lib/api/notifications';

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn(), put: jest.fn() },
}));

const mocked = api as jest.Mocked<typeof api>;

beforeEach(() => {
  jest.clearAllMocks();
  for (const method of ['get', 'post', 'patch', 'delete', 'put'] as const) {
    mocked[method].mockResolvedValue({ data: {} } as never);
  }
});

describe('single transfers client', () => {
  it('the duplicate lib/query/queries/transfers module is gone', () => {
    expect(existsSync(path.join(__dirname, '../lib/query/queries/transfers.ts'))).toBe(false);
  });

  it('uses the uppercase statuses the backend returns', () => {
    expect(Object.values(TransferStatus)).toEqual(
      ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'],
    );
  });

  it('cancels with POST /transfers/:id/cancel, never DELETE', async () => {
    await transferApiClient.cancelTransfer('t-1');
    expect(mocked.post).toHaveBeenCalledWith('/transfers/t-1/cancel');
    expect(mocked.delete).not.toHaveBeenCalled();
  });

  it('approves and rejects with POST', async () => {
    await transferApiClient.approveTransfer('t-1');
    await transferApiClient.rejectTransfer('t-1', { reason: 'no' });
    expect(mocked.post).toHaveBeenCalledWith('/transfers/t-1/approve');
    expect(mocked.post).toHaveBeenCalledWith('/transfers/t-1/reject', { reason: 'no' });
    expect(mocked.put).not.toHaveBeenCalled();
  });
});

describe('notifications client', () => {
  it('marks one notification read with PATCH, not PUT', async () => {
    await notificationsApiClient.markRead('n-1');
    expect(mocked.patch).toHaveBeenCalledWith('/notifications/n-1/read');
    expect(mocked.put).not.toHaveBeenCalled();
  });
});

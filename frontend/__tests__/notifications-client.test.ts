import { api } from '@/lib/api';
import { notificationsApiClient } from '@/lib/api/notifications';

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), patch: jest.fn() },
}));

const mocked = api as jest.Mocked<typeof api>;

beforeEach(() => {
  jest.clearAllMocks();
  mocked.patch.mockResolvedValue({ data: {} } as never);
});

describe('notificationsApiClient', () => {
  it('marks everything read through PATCH /notifications/read-all', async () => {
    await notificationsApiClient.markAllRead();
    expect(mocked.patch).toHaveBeenCalledWith('/notifications/read-all');
  });

  it('marks one notification read through PATCH /notifications/:id/read', async () => {
    await notificationsApiClient.markRead('n-1');
    expect(mocked.patch).toHaveBeenCalledWith('/notifications/n-1/read');
  });

  it('no longer calls the removed mark-all-read route', async () => {
    await notificationsApiClient.markAllRead();
    expect(mocked.patch).not.toHaveBeenCalledWith('/notifications/mark-all-read');
  });
});

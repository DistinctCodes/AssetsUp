import { notificationsApiClient } from '@/lib/api/notifications';
import { api } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), patch: jest.fn() },
}));

describe('notificationsApiClient', () => {
  beforeEach(() => jest.clearAllMocks());

  it('markAllRead calls PATCH /notifications/read-all', async () => {
    (api.patch as jest.Mock).mockResolvedValue({ data: { updated: 3 } });
    await notificationsApiClient.markAllRead();
    expect(api.patch).toHaveBeenCalledWith('/notifications/read-all');
  });

  it('markRead calls PATCH /notifications/:id/read', async () => {
    (api.patch as jest.Mock).mockResolvedValue({ data: {} });
    await notificationsApiClient.markRead('abc');
    expect(api.patch).toHaveBeenCalledWith('/notifications/abc/read');
  });
});

import { api } from '@/lib/api';
import { notificationsApiClient } from '@/lib/api/notifications';

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

describe('notificationsApiClient.markAllRead', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.patch as jest.Mock).mockResolvedValue({ data: { updated: 1 } });
  });

  it('PATCHes the backend read-all route', async () => {
    await notificationsApiClient.markAllRead();

    expect(api.patch).toHaveBeenCalledTimes(1);
    expect(api.patch).toHaveBeenCalledWith('/notifications/read-all');
  });
});

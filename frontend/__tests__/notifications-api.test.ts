import { api } from '@/lib/api';
import { notificationsApiClient } from '@/lib/api/notifications';

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), patch: jest.fn() },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('notificationsApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('markAllRead sends PATCH /notifications/read-all', async () => {
    mockedApi.patch.mockResolvedValue({ data: undefined });

    await expect(notificationsApiClient.markAllRead()).resolves.toBeUndefined();

    expect(mockedApi.patch).toHaveBeenCalledWith('/notifications/read-all');
  });
});

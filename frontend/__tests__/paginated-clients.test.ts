import { api } from '@/lib/api';
import { assetApiClient } from '@/lib/api/assets';
import { poApiClient } from '@/lib/api/purchase-orders';
import { usersApiClient } from '@/lib/api/users';
import { vendorApiClient } from '@/lib/api/vendors';

jest.mock('@/lib/api', () => ({ api: { get: jest.fn() } }));

const mocked = api as jest.Mocked<typeof api>;

const page = <T,>(items: T[]) => ({ items, total: items.length, page: 1, limit: 20, totalPages: 1 });

beforeEach(() => jest.clearAllMocks());

describe('paginated list clients return { items, total, ... }', () => {
  it.each([
    ['users', '/users', () => usersApiClient.getUsers({ page: 2, limit: 20 })],
    ['vendors', '/vendors', () => vendorApiClient.getVendors({ page: 2, limit: 20 })],
    ['purchase orders', '/purchase-orders', () => poApiClient.getPOs({ page: 2, limit: 20 })],
    ['departments', '/departments', () => assetApiClient.getDepartments({ page: 2, limit: 20 })],
  ])('%s', async (_name, url, call) => {
    const body = page([{ id: '1' }]);
    mocked.get.mockResolvedValue({ data: body } as never);

    await expect(call()).resolves.toEqual(body);
    expect(mocked.get).toHaveBeenCalledWith(url, { params: { page: 2, limit: 20 } });
  });
});

describe('option lists for select boxes', () => {
  it('returns the items of the first 100 vendors', async () => {
    mocked.get.mockResolvedValue({ data: page([{ id: 'v1' }]) } as never);
    await expect(vendorApiClient.getVendorOptions()).resolves.toEqual([{ id: 'v1' }]);
    expect(mocked.get).toHaveBeenCalledWith('/vendors', { params: { limit: 100 } });
  });

  it('returns the items of the first 100 departments', async () => {
    mocked.get.mockResolvedValue({ data: page([{ id: 'd1' }]) } as never);
    await expect(assetApiClient.getDepartmentOptions()).resolves.toEqual([{ id: 'd1' }]);
    expect(mocked.get).toHaveBeenCalledWith('/departments', { params: { limit: 100 } });
  });

  it('returns the items of the first 100 users for pickers', async () => {
    mocked.get.mockResolvedValue({ data: page([{ id: 'u1' }]) } as never);
    await expect(assetApiClient.getUsers()).resolves.toEqual([{ id: 'u1' }]);
    expect(mocked.get).toHaveBeenCalledWith('/users', { params: { limit: 100 } });
  });
});

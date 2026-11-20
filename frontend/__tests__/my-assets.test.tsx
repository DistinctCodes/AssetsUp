import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Asset } from '@/lib/query/types/asset';
import { AssetStatus } from '@/lib/query/types/asset';
import { assetApiClient, normalizeAssetPage } from '@/lib/api/assets';
import { fetchAllMyAssets } from '@/lib/query/hooks/useMyAssets';
import { fromReservation, fromTransfer, byNewest, myRequestsApiClient } from '@/lib/api/my-requests';
import { api } from '@/lib/api';

jest.mock('@/lib/api', () => ({ api: { get: jest.fn() } }));
jest.mock('@/store/auth.store', () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => selector({ user: { id: 'u-1', role: 'EMPLOYEE' } }),
}));

import MyAssetsPage from '@/app/(dashboard)/my-assets/page';

const mockedApi = api as jest.Mocked<typeof api>;

const asset = (id: string): Asset =>
  ({ id, assetId: `AST-${id}`, name: `Laptop ${id}`, status: AssetStatus.ASSIGNED, condition: 'GOOD', imageUrls: [] }) as unknown as Asset;

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MyAssetsPage />
    </QueryClientProvider>,
  );
};

beforeEach(() => jest.clearAllMocks());

describe('fetchAllMyAssets', () => {
  it('asks the server for the caller\'s assets and pages until the total is reached', async () => {
    const getAssets = jest
      .spyOn(assetApiClient, 'getAssets')
      .mockResolvedValueOnce({ data: [asset('1'), asset('2')], total: 3, page: 1, limit: 100 })
      .mockResolvedValueOnce({ data: [asset('3')], total: 3, page: 2, limit: 100 });

    const result = await fetchAllMyAssets();

    expect(result.map((a) => a.id)).toEqual(['1', '2', '3']);
    expect(getAssets).toHaveBeenNthCalledWith(1, { assignedToId: 'me', page: 1, limit: 100 });
    expect(getAssets).toHaveBeenNthCalledWith(2, { assignedToId: 'me', page: 2, limit: 100 });
    getAssets.mockRestore();
  });

  it('stops on an empty page instead of looping', async () => {
    const getAssets = jest
      .spyOn(assetApiClient, 'getAssets')
      .mockResolvedValue({ data: [], total: 5, page: 1, limit: 100 });
    await expect(fetchAllMyAssets()).resolves.toEqual([]);
    expect(getAssets).toHaveBeenCalledTimes(1);
    getAssets.mockRestore();
  });
});

describe('normalizeAssetPage', () => {
  it('maps the backend items onto data', () => {
    expect(normalizeAssetPage({ items: [asset('1')], total: 1, page: 1, limit: 20 })).toEqual({
      data: [asset('1')],
      total: 1,
      page: 1,
      limit: 20,
    });
  });

  it('passes an already-shaped page through', () => {
    const page = { data: [asset('1')], total: 1, page: 1, limit: 20 };
    expect(normalizeAssetPage(page)).toBe(page);
  });
});

describe('My requests data', () => {
  it('merges pending transfers and reservations, newest first', async () => {
    mockedApi.get.mockImplementation(((url: string) =>
      Promise.resolve({
        data:
          url === '/transfers'
            ? { items: [{ id: 't-1', assetId: 'a-1', status: 'PENDING', createdAt: '2026-02-01T00:00:00Z' }], total: 1 }
            : [{ id: 'r-1', assetId: 'a-2', asset: { name: 'Projector' }, purpose: 'Demo', startsAt: '2026-03-01T00:00:00Z', status: 'PENDING', createdAt: '2026-03-01T00:00:00Z' }],
      })) as never);

    const list = await myRequestsApiClient.list('u-1');

    expect(mockedApi.get).toHaveBeenCalledWith('/transfers', {
      params: { requestedByUserId: 'me', status: 'PENDING', limit: 100 },
    });
    expect(mockedApi.get).toHaveBeenCalledWith('/reservations', { params: { userId: 'u-1', status: 'PENDING' } });
    expect(list.map((r) => [r.type, r.id])).toEqual([['reservation', 'r-1'], ['transfer', 't-1']]);
    expect(list[0].title).toBe('Projector: Demo');
  });

  it('builds readable titles and falls back to ids', () => {
    expect(fromTransfer({ id: 't', assetId: 'a-9', status: 'PENDING', createdAt: 'x' }).title).toBe('Transfer request for asset a-9');
    expect(fromReservation({ id: 'r', assetId: 'a-9', startsAt: 's', status: 'PENDING' }).title).toBe('Reservation for a-9');
    expect(byNewest({ createdAt: '2026-01-01' } as never, { createdAt: '2026-02-01' } as never)).toBeGreaterThan(0);
  });
});

describe('My Assets page', () => {
  it('lists the assets returned by the server filter and shows their count', async () => {
    mockedApi.get.mockImplementation(((url: string) => {
      if (url === '/assets') return Promise.resolve({ data: { items: [asset('1'), asset('2')], total: 2, page: 1, limit: 100 } });
      if (url === '/transfers') return Promise.resolve({ data: { items: [], total: 0 } });
      return Promise.resolve({ data: [] });
    }) as never);

    renderPage();

    expect(await screen.findByText('Laptop 1')).toBeInTheDocument();
    expect(screen.getByText('Laptop 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /my assets \(2\)/i })).toBeInTheDocument();
    expect(mockedApi.get).toHaveBeenCalledWith('/assets', { params: { assignedToId: 'me', page: 1, limit: 100 } });
  });

  it('shows the real requests on the My Requests tab', async () => {
    mockedApi.get.mockImplementation(((url: string) => {
      if (url === '/assets') return Promise.resolve({ data: { items: [], total: 0, page: 1, limit: 100 } });
      if (url === '/transfers') return Promise.resolve({ data: { items: [{ id: 't-1', assetId: 'a-1', status: 'PENDING', createdAt: '2026-02-01T00:00:00Z' }], total: 1 } });
      return Promise.resolve({ data: [] });
    }) as never);

    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: /my requests \(1\)/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /my requests/i }));

    expect(await screen.findByText('Transfer request for asset a-1')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });
});

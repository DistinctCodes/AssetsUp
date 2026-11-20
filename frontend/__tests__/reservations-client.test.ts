import { api } from '@/lib/api';
import { reservationsApiClient, toReservation } from '@/lib/api/reservations';

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

const mocked = api as jest.Mocked<typeof api>;

beforeEach(() => jest.clearAllMocks());

const record = {
  id: 'r-1',
  assetId: 'a-1',
  asset: { name: 'Projector' },
  reservedBy: { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@x.com' },
  purpose: 'Demo',
  startsAt: '2026-01-01T09:00:00Z',
  endsAt: '2026-01-01T10:00:00Z',
  status: 'CONFIRMED' as const,
};

describe('reservationsApiClient', () => {
  it('lists the signed-in user\'s reservations with GET /reservations?userId=', async () => {
    mocked.get.mockResolvedValue({ data: [record] } as never);

    const result = await reservationsApiClient.listMine('u-1');

    expect(mocked.get).toHaveBeenCalledWith('/reservations', { params: { userId: 'u-1' } });
    expect(mocked.get).not.toHaveBeenCalledWith('/reservations/mine', expect.anything());
    expect(result[0]).toMatchObject({ id: 'r-1', assetName: 'Projector', requester: 'Ada Lovelace' });
  });

  it('lists everything with GET /reservations and no filter', async () => {
    mocked.get.mockResolvedValue({ data: [] } as never);
    await reservationsApiClient.listAll();
    expect(mocked.get).toHaveBeenCalledWith('/reservations');
  });

  it('reads availability from GET /assets/:id/availability?from&to', async () => {
    mocked.get.mockResolvedValue({
      data: { busy: [{ startsAt: 's', endsAt: 'e' }] },
    } as never);

    const result = await reservationsApiClient.getAvailability('a 1', 'F', 'T');

    expect(mocked.get).toHaveBeenCalledWith('/assets/a%201/availability', {
      params: { from: 'F', to: 'T' },
    });
    expect(result.busy).toHaveLength(1);
  });
});

describe('toReservation', () => {
  it('falls back to ids and the email when relations are missing', () => {
    expect(toReservation({ ...record, asset: null, reservedBy: { email: 'ada@x.com' } })).toMatchObject({
      assetName: 'a-1',
      requester: 'ada@x.com',
    });
    expect(toReservation({ ...record, reservedBy: null }).requester).toBe('Unknown');
  });
});

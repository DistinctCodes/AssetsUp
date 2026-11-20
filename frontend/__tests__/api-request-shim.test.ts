import { api } from '@/lib/api';
import { apiClient } from '@/lib/api/client';

jest.mock('@/lib/api', () => ({
  api: { request: jest.fn(), get: jest.fn(), post: jest.fn(), delete: jest.fn(), patch: jest.fn() },
}));

const mocked = api as jest.Mocked<typeof api>;

beforeEach(() => {
  jest.clearAllMocks();
  mocked.request.mockResolvedValue({ data: { ok: true } } as never);
});

describe('apiClient.request', () => {
  it('sends a GET with no body and no stray config', async () => {
    await apiClient.request('/assets?limit=5');
    expect(mocked.request).toHaveBeenCalledWith({ method: 'get', url: '/assets?limit=5' });
    expect(mocked.get).not.toHaveBeenCalled();
  });

  it('does not let a GET body leak into the request config', async () => {
    await apiClient.request('/assets', {
      method: 'GET',
      body: JSON.stringify({ params: { evil: 1 }, headers: { 'X-Evil': '1' } }),
    });
    const config = mocked.request.mock.calls[0][0];
    expect(config).toEqual({ method: 'get', url: '/assets' });
  });

  it('sends the body of a DELETE as data', async () => {
    await apiClient.request('/transfers/t-1', {
      method: 'DELETE',
      body: JSON.stringify({ reason: 'duplicate' }),
    });
    expect(mocked.request).toHaveBeenCalledWith({
      method: 'delete',
      url: '/transfers/t-1',
      data: { reason: 'duplicate' },
    });
    expect(mocked.delete).not.toHaveBeenCalled();
  });

  it.each(['POST', 'PUT', 'PATCH'])('sends the body of a %s as data', async (method) => {
    await apiClient.request('/things', { method, body: JSON.stringify({ a: 1 }) });
    expect(mocked.request).toHaveBeenCalledWith({
      method: method.toLowerCase(),
      url: '/things',
      data: { a: 1 },
    });
  });

  it('returns the response payload', async () => {
    await expect(apiClient.request('/x')).resolves.toEqual({ ok: true });
  });
});

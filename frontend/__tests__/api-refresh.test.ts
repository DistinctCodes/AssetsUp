import axios, { AxiosError, AxiosHeaders } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { api } from '@/lib/api';

const unauthorized = (config: InternalAxiosRequestConfig) =>
  new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, {}, {
    status: 401,
    statusText: 'Unauthorized',
    data: {},
    headers: {},
    config,
  });

/** An adapter standing in for the server: only the fresh access token is accepted. */
function installServer(seen: string[]) {
  api.defaults.adapter = async (config) => {
    const header = String(AxiosHeaders.from(config.headers).get('Authorization'));
    seen.push(header);
    if (header !== 'Bearer fresh-access') throw unauthorized(config);
    return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
  };
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('accessToken', 'expired-access');
  localStorage.setItem('refreshToken', 'old-refresh');
  jest.restoreAllMocks();
});

describe('token refresh on 401', () => {
  it('posts the refresh token in the body, stores the new pair and retries the request', async () => {
    const seen: string[] = [];
    installServer(seen);
    const post = jest.spyOn(axios, 'post').mockResolvedValue({
      // Wrapped in the backend's envelope.
      data: {
        success: true,
        data: { accessToken: 'fresh-access', refreshToken: 'fresh-refresh' },
      },
    });

    const response = await api.get('/assets');

    expect(response.data).toEqual({ ok: true });
    expect(post).toHaveBeenCalledTimes(1);
    const [url, body, config] = post.mock.calls[0] as [string, unknown, unknown];
    expect(url).toMatch(/\/auth\/refresh$/);
    expect(body).toEqual({ refreshToken: 'old-refresh' });
    expect(config).toBeUndefined(); // no Authorization header carrying the refresh token
    expect(seen).toEqual(['Bearer expired-access', 'Bearer fresh-access']);
    expect(localStorage.getItem('accessToken')).toBe('fresh-access');
    expect(localStorage.getItem('refreshToken')).toBe('fresh-refresh');
  });

  it('also accepts an unwrapped refresh response', async () => {
    installServer([]);
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: { accessToken: 'fresh-access', refreshToken: 'fresh-refresh' },
    });
    await expect(api.get('/assets')).resolves.toMatchObject({ data: { ok: true } });
  });

  it('refreshes once for several concurrent expired requests', async () => {
    installServer([]);
    const post = jest.spyOn(axios, 'post').mockResolvedValue({
      data: { success: true, data: { accessToken: 'fresh-access', refreshToken: 'fresh-refresh' } },
    });

    await Promise.all([api.get('/a'), api.get('/b'), api.get('/c')]);

    expect(post).toHaveBeenCalledTimes(1);
  });
});

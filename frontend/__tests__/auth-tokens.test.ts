import { AUTH_COOKIE } from '@/lib/auth-routes';
import { clearTokens, persistTokens } from '@/lib/auth-tokens';

const cookieNames = () =>
  document.cookie
    .split(';')
    .map((c) => c.trim().split('=')[0])
    .filter(Boolean);

beforeEach(() => {
  localStorage.clear();
  clearTokens();
});

describe('persistTokens / clearTokens', () => {
  it('stores both tokens and the cookie the middleware reads', () => {
    persistTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });

    expect(localStorage.getItem('accessToken')).toBe('access-1');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-1');
    expect(document.cookie).toContain(`${AUTH_COOKIE}=access-1`);
  });

  it('overwrites a previous session', () => {
    persistTokens({ accessToken: 'old', refreshToken: 'old-r' });
    persistTokens({ accessToken: 'new', refreshToken: 'new-r' });

    expect(localStorage.getItem('accessToken')).toBe('new');
    expect(document.cookie).toContain(`${AUTH_COOKIE}=new`);
    expect(document.cookie).not.toContain('=old');
  });

  it('removes tokens and the cookie on clear', () => {
    persistTokens({ accessToken: 'a', refreshToken: 'r' });
    clearTokens();

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(cookieNames()).not.toContain(AUTH_COOKIE);
  });
});

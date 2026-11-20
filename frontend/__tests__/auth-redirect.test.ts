import { redirectToLogin } from '@/lib/auth-redirect';

const at = (pathname: string) => ({ pathname, href: pathname });

describe('redirectToLogin', () => {
  it.each(['/login', '/register', '/forgot-password', '/reset-password', '/scan/abc', '/'])(
    'does not redirect while already on %s',
    (path) => {
      const location = at(path);
      expect(redirectToLogin(location)).toBe(false);
      expect(location.href).toBe(path);
    },
  );

  it.each(['/dashboard', '/assets/123', '/settings'])(
    'redirects from the protected page %s',
    (path) => {
      const location = at(path);
      expect(redirectToLogin(location)).toBe(true);
      expect(location.href).toBe('/login');
    },
  );
});

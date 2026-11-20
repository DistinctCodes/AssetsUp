import { isAuthPage, isPublicPath } from './auth-routes';

/**
 * Sends the browser to /login after the session is lost, unless it is already on
 * a page that signed-out users may see (login, register, /scan/..., the home page).
 * A hard redirect from those pages reloads them, which re-runs the failing request
 * and redirects again, forever. Returns whether a redirect was started.
 */
export function redirectToLogin(
  location: Pick<Location, 'pathname' | 'href'> = window.location,
): boolean {
  const pathname = location.pathname ?? '';
  if (isAuthPage(pathname) || isPublicPath(pathname)) {
    return false;
  }
  location.href = '/login';
  return true;
}

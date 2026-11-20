import { AUTH_COOKIE } from './auth-routes';

export const ACCESS_TOKEN_KEY = 'accessToken';
export const REFRESH_TOKEN_KEY = 'refreshToken';

/** The cookie only tells the middleware "a session exists"; it lives as long as the refresh token (7 days). */
const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * The backend returns tokens in the JSON body and never sets cookies, so the
 * client owns persistence: localStorage feeds the axios interceptor and a
 * (non-HttpOnly) cookie feeds `middleware.ts`.
 */
export function persistTokens({ accessToken, refreshToken }: TokenPair): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${AUTH_COOKIE}=${encodeURIComponent(accessToken)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

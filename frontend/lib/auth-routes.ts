/** Name of the cookie the auth store writes and the middleware reads. */
export const AUTH_COOKIE = "accessToken";

/** Pages only meant for signed-out users. */
export const AUTH_PAGES = ["/login", "/register", "/forgot-password"];

/** Reachable without signing in (besides the auth pages). */
const PUBLIC_PREFIXES = ["/scan"];

const matches = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

export const isAuthPage = (pathname: string) =>
  AUTH_PAGES.some((p) => matches(pathname, p));

export const isPublicPath = (pathname: string) =>
  pathname === "/" ||
  isAuthPage(pathname) ||
  PUBLIC_PREFIXES.some((p) => matches(pathname, p));

export type AuthDecision =
  | { action: "next" }
  | { action: "redirect"; to: string; redirectParam?: string };

/**
 * Everything is protected unless it is explicitly public, so a new
 * `(dashboard)` route is guarded without touching this file.
 */
export function decideAuth(pathname: string, hasToken: boolean): AuthDecision {
  if (isAuthPage(pathname)) {
    return hasToken
      ? { action: "redirect", to: "/dashboard" }
      : { action: "next" };
  }
  if (isPublicPath(pathname) || hasToken) return { action: "next" };
  return { action: "redirect", to: "/login", redirectParam: pathname };
}

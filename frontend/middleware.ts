import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = ['/dashboard', '/assets', '/departments', '/users', '/reports', '/settings'];
const AUTH_PAGES = ['/login', '/register'];

export function middleware(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  const { pathname } = req.nextUrl;

  const isAuthenticated = !!token;
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  const isAuthPage = AUTH_PAGES.some((route) => pathname.startsWith(route));

  // Redirect root to dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Redirect unauthenticated users from protected routes to login
  if (isProtectedRoute && !isAuthenticated) {
    const url = new URL('/login', req.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages to dashboard
  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/assets/:path*',
    '/departments/:path*',
    '/users/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/login',
    '/register',
  ],
};

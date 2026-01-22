import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
const PROTECTED = ['/dashboard', '/assets', '/departments', '/users'];
const AUTH_PAGES = ['/signin', '/signup'];

export const middleware = (req: NextRequest) => {
  const token = req.cookies.get('auth-token')?.value;
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED.some((route) => pathname.startsWith(route));
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (isProtected && !token) {
    const url = new URL('/signin', req.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
};

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/assets/:path*',
    '/departments/:path*',
    '/users/:path*',
    '/signin',
    '/signup',
  ],
};

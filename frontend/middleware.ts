import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, decideAuth } from "@/lib/auth-routes";

export const middleware = (req: NextRequest) => {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const { pathname } = req.nextUrl;

  const decision = decideAuth(pathname, Boolean(token));
  if (decision.action === "next") return NextResponse.next();

  const url = new URL(decision.to, req.url);
  if (decision.redirectParam) {
    url.searchParams.set("redirect", decision.redirectParam);
  }
  return NextResponse.redirect(url);
};

export const config = {
  // Run on every page except Next internals, API routes and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

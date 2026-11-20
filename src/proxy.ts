import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";

const PROTECTED_PREFIXES = ["/dashboard", "/clipboard", "/contacts", "/settings"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtectedPath = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/clipboard/:path*", "/contacts/:path*", "/settings/:path*"],
};
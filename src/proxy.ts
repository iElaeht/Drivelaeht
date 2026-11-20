import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";

const PROTECTED_PREFIXES = ["/dashboard", "/clipboard", "/contacts", "/settings"];
const GUEST_ONLY_PREFIXES = ["/login", "/register", "/forgot-password"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const hasSession = Boolean(sessionToken && sessionToken.trim().length > 0);

  const isGuestOnlyPath = GUEST_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (hasSession && isGuestOnlyPath) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const isProtectedPath = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!hasSession && isProtectedPath) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login/:path*",
    "/register/:path*",
    "/forgot-password/:path*",
    "/dashboard/:path*",
    "/clipboard/:path*",
    "/contacts/:path*",
    "/settings/:path*",
  ],
};
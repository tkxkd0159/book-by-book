import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { resolveAuthSecret } from "@/lib/auth/secret";

const PUBLIC_PAGE_PATHS = new Set(["/", "/signin", "/auth/error"]);
const AUTH_API_PREFIX = "/api/auth";
const PUBLIC_API_PATHS = new Set<string>([]);

function isApiPath(pathname: string) {
  return pathname.startsWith("/api/");
}

function isPublicPath(pathname: string) {
  if (PUBLIC_PAGE_PATHS.has(pathname)) {
    return true;
  }

  if (pathname.startsWith(AUTH_API_PREFIX)) {
    return true;
  }

  if (isApiPath(pathname) && PUBLIC_API_PATHS.has(pathname)) {
    return true;
  }

  return false;
}

function createSignInRedirect(request: NextRequest) {
  const signInUrl = new URL("/signin", request.url);
  const callbackUrl = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  signInUrl.searchParams.set("callbackUrl", callbackUrl || "/books/search");
  return NextResponse.redirect(signInUrl);
}

export async function proxy(request: NextRequest) {
  if (process.env.E2E_BYPASS_AUTH === "1") {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  const token = await getToken({
    req: request,
    secret: resolveAuthSecret(),
  });

  if (pathname === "/signin" && token) {
    return NextResponse.redirect(new URL("/books/search", request.url));
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (token) {
    return NextResponse.next();
  }

  if (isApiPath(pathname)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return createSignInRedirect(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};

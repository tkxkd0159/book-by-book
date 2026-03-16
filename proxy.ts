import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { E2E_AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { resolveAuthSecret } from "@/lib/auth/secret";

const PUBLIC_PAGE_PATHS = new Set(["/", "/signin", "/auth/error"]);
const AUTH_API_PATH = "/api/auth";
const E2E_PUBLIC_API_PATHS = new Set(["/api/test/auth", "/api/test/reset"]);
const PROTECTED_PAGE_PREFIXES = ["/books", "/clubs", "/me"];

function hasPathPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PAGE_PATHS.has(pathname) ||
    hasPathPrefix(pathname, AUTH_API_PATH) ||
    (process.env.E2E_BYPASS_AUTH === "1" &&
      E2E_PUBLIC_API_PATHS.has(pathname))
  );
}

function isProtectedPagePath(pathname: string) {
  return PROTECTED_PAGE_PREFIXES.some((prefix) =>
    hasPathPrefix(pathname, prefix),
  );
}

function createSignInRedirect(request: NextRequest) {
  const signInUrl = new URL("/signin", request.url);
  const callbackUrl = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  signInUrl.searchParams.set("callbackUrl", callbackUrl);
  return NextResponse.redirect(signInUrl);
}

async function hasOptimisticSession(request: NextRequest) {
  if (
    process.env.E2E_BYPASS_AUTH === "1" &&
    request.cookies.get(E2E_AUTH_COOKIE_NAME)?.value
  ) {
    return true;
  }

  const token = await getToken({
    req: request,
    secret: resolveAuthSecret(),
  });

  return Boolean(token);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isPublicPath(pathname) || !isProtectedPagePath(pathname)) {
    return NextResponse.next();
  }

  if (await hasOptimisticSession(request)) {
    return NextResponse.next();
  }

  return createSignInRedirect(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};

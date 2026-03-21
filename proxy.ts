import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { AUTH_REQUEST_PATH_HEADER } from "@/lib/auth/redirects";
import { resolveAuthSecret } from "@/lib/auth/secret";
import {
  E2E_AUTH_COOKIE_NAME,
  isE2EBypassEnabled,
} from "@/lib/test-harness/auth";

const PUBLIC_PAGE_PATHS = new Set(["/", "/signin", "/auth/error"]);
const AUTH_API_PATH = "/api/auth";
const E2E_PUBLIC_API_PATHS = new Set([
  "/api/test/auth",
  "/api/test/reset",
]);
const PROTECTED_PAGE_PREFIXES = ["/books", "/clubs", "/me"];

function hasPathPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isPublicPath(pathname: string) {
  const e2eBypassEnabled = isE2EBypassEnabled();

  return (
    PUBLIC_PAGE_PATHS.has(pathname) ||
    (e2eBypassEnabled && E2E_PUBLIC_API_PATHS.has(pathname))
  );
}

function isProtectedPagePath(pathname: string) {
  return PROTECTED_PAGE_PREFIXES.some((prefix) =>
    hasPathPrefix(pathname, prefix),
  );
}

function isAuthApiPath(pathname: string) {
  return hasPathPrefix(pathname, AUTH_API_PATH);
}

function createPassThroughResponse(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    AUTH_REQUEST_PATH_HEADER,
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

function createSignInRedirect(request: NextRequest) {
  const signInUrl = new URL("/signin", request.url);
  const callbackUrl = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  signInUrl.searchParams.set("callbackUrl", callbackUrl);
  return NextResponse.redirect(signInUrl);
}

async function readOptimisticToken(request: NextRequest) {
  if (isE2EBypassEnabled() && request.cookies.get(E2E_AUTH_COOKIE_NAME)?.value) {
    return null;
  }

  return getToken({
    req: request,
    secret: resolveAuthSecret(),
  });
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtectedPath = isProtectedPagePath(pathname);
  const e2eBypassEnabled = isE2EBypassEnabled();

  if (e2eBypassEnabled && E2E_PUBLIC_API_PATHS.has(pathname)) {
    return createPassThroughResponse(request);
  }

  const token = await readOptimisticToken(request);

  if (isPublicPath(pathname) || isAuthApiPath(pathname) || !isProtectedPath) {
    return createPassThroughResponse(request);
  }

  if (
    (e2eBypassEnabled && request.cookies.get(E2E_AUTH_COOKIE_NAME)?.value) ||
    Boolean(token)
  ) {
    return createPassThroughResponse(request);
  }

  return createSignInRedirect(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};

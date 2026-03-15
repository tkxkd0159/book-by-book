import { NextRequest, NextResponse } from "next/server";

import { E2E_AUTH_COOKIE_NAME, isE2EBypassEnabled } from "@/lib/auth/e2e";
import { getTestUser, type TestUserKey } from "@/lib/test/fixtures";

export const runtime = "nodejs";

function isTestUserKey(value: string): value is TestUserKey {
  return value === "owner" || value === "member" || value === "stranger";
}

export async function GET(request: NextRequest) {
  if (!isE2EBypassEnabled()) {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  const userKey = request.nextUrl.searchParams.get("user") ?? "";
  const returnTo = request.nextUrl.searchParams.get("returnTo") ?? "/clubs";

  if (!isTestUserKey(userKey)) {
    return NextResponse.json({ error: "Unknown test user." }, { status: 400 });
  }

  const response = NextResponse.redirect(new URL(returnTo, request.url));
  response.cookies.set(E2E_AUTH_COOKIE_NAME, getTestUser(userKey).key, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });
  return response;
}

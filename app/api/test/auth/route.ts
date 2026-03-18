import { NextRequest, NextResponse } from "next/server";

import { E2E_AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { isE2EBypassEnabled } from "@/lib/auth/e2e";
import {
  getTestUser,
  seedTestUsers,
} from "@/lib/test/fixtures";
import {
  E2E_DEFAULT_RETURN_TO,
  TEST_ROUTE_ERROR_MESSAGES,
  isTestUserKey,
} from "@/lib/test/constants";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isE2EBypassEnabled()) {
    return NextResponse.json(
      { error: TEST_ROUTE_ERROR_MESSAGES.notAvailable },
      { status: 404 },
    );
  }

  const userKey = request.nextUrl.searchParams.get("user") ?? "";
  const returnTo =
    request.nextUrl.searchParams.get("returnTo") ?? E2E_DEFAULT_RETURN_TO;

  if (!isTestUserKey(userKey)) {
    return NextResponse.json(
      { error: TEST_ROUTE_ERROR_MESSAGES.unknownTestUser },
      { status: 400 },
    );
  }

  await seedTestUsers();

  const response = NextResponse.redirect(new URL(returnTo, request.url));
  response.cookies.set(E2E_AUTH_COOKIE_NAME, getTestUser(userKey).key, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });
  return response;
}

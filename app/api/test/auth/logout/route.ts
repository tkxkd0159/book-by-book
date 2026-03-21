import { NextRequest, NextResponse } from "next/server";

import { isE2EBypassEnabled } from "@/lib/test-harness/auth";
import {
  E2E_AUTH_COOKIE_NAME,
  E2E_DEFAULT_RETURN_TO,
  TEST_ROUTE_ERROR_MESSAGES,
} from "@/lib/test-harness/constants";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isE2EBypassEnabled()) {
    return NextResponse.json(
      { error: TEST_ROUTE_ERROR_MESSAGES.notAvailable },
      { status: 404 },
    );
  }

  const returnTo =
    request.nextUrl.searchParams.get("returnTo") ?? E2E_DEFAULT_RETURN_TO;

  const response = NextResponse.redirect(new URL(returnTo, request.url));
  response.cookies.set(E2E_AUTH_COOKIE_NAME, "", {
    expires: new Date(0),
    httpOnly: false,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
  });
  return response;
}

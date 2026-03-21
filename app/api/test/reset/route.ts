import { NextResponse } from "next/server";

import { isE2EBypassEnabled } from "@/lib/auth/e2e";
import { resetMemoryMutationRateLimitStore } from "@/lib/rate-limit/mutation";
import { TEST_ROUTE_ERROR_MESSAGES } from "@/tests/support/constants";
import { resetTestDatabase } from "@/tests/support/fixtures";

export const runtime = "nodejs";

export async function GET() {
  if (!isE2EBypassEnabled()) {
    return NextResponse.json(
      { error: TEST_ROUTE_ERROR_MESSAGES.notAvailable },
      { status: 404 },
    );
  }

  await resetTestDatabase();
  resetMemoryMutationRateLimitStore();
  return NextResponse.json({ ok: true });
}

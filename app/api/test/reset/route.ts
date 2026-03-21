import { NextResponse } from "next/server";

import { resetMemoryMutationRateLimitStore } from "@/lib/rate-limit/mutation";
import { isE2EBypassEnabled } from "@/lib/test-harness/auth";
import { TEST_ROUTE_ERROR_MESSAGES } from "@/lib/test-harness/constants";
import { resetTestDatabase } from "@/lib/test-harness/fixtures";

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

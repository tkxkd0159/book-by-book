import { NextResponse } from "next/server";

import { isE2EBypassEnabled } from "@/lib/auth/e2e";
import { resetMemoryMutationRateLimitStore } from "@/lib/rate-limit/mutation";
import { resetTestDatabase } from "@/lib/test/fixtures";

export const runtime = "nodejs";

export async function GET() {
  if (!isE2EBypassEnabled()) {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  await resetTestDatabase();
  resetMemoryMutationRateLimitStore();
  return NextResponse.json({ ok: true });
}

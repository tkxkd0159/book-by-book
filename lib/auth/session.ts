import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth/options";

export async function getAuthSessionSafe() {
  try {
    return await getServerSession(authOptions);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      error.digest === "DYNAMIC_SERVER_USAGE"
    ) {
      throw error;
    }

    // A stale or invalid JWT cookie should not break rendering.
    console.error("[auth] Failed to read session. Treating request as signed out.", error);
    return null;
  }
}

import { env } from "./lib/env";

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  try {
    env.validateForStartupOrThrow();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    throw error;
  }
}

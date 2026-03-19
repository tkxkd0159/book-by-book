import { getAuthSecret } from "@/lib/env";

export function resolveAuthSecret(options?: {
  env?: NodeJS.ProcessEnv;
  allowTestFallback?: boolean;
}) {
  return getAuthSecret(options?.env, {
    allowTestFallback: options?.allowTestFallback,
  });
}

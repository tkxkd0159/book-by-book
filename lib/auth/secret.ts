import { AppEnv, env } from "@/lib/env";

export function resolveAuthSecret(options?: {
  env?: NodeJS.ProcessEnv;
  allowTestFallback?: boolean;
}) {
  return (options?.env ? AppEnv.from(options.env) : env).resolveAuthSecret({
    allowTestFallback: options?.allowTestFallback,
  });
}

import { getMutationRateLimitStore } from "@/lib/rate-limit/mutation";

type AdminSignInRateLimitScope = "email_ip" | "ip";

type AdminSignInRateLimitPolicy = {
  limit: number;
  windowSeconds: number;
};

export type AdminSignInRateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: string;
  retryAfterSeconds: number;
  scope: AdminSignInRateLimitScope;
};

const ADMIN_SIGNIN_RATE_LIMIT_KEY_PREFIX = "bbb:ratelimit:v1:admin-signin";
const DEFAULT_ADMIN_SIGNIN_FAILURE_MESSAGE =
  "Sign-in failed. Check the details you provided are correct.";

export class AdminSignInRateLimitError extends Error {
  readonly decisions: readonly AdminSignInRateLimitDecision[];

  constructor(decisions: readonly AdminSignInRateLimitDecision[]) {
    super(
      `${DEFAULT_ADMIN_SIGNIN_FAILURE_MESSAGE} Try again ${formatRetryAfter(
        Math.max(...decisions.map((decision) => decision.retryAfterSeconds)),
      )}.`,
    );
    this.name = "AdminSignInRateLimitError";
    this.decisions = decisions;
  }
}

function readPositiveIntegerEnv(name: string, fallback: number) {
  const rawValue = process.env[name]?.trim();
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function getAdminSignInRateLimitPolicy(scope: AdminSignInRateLimitScope) {
  if (scope === "email_ip") {
    return {
      limit: readPositiveIntegerEnv(
        "RATE_LIMIT_ADMIN_SIGNIN_EMAIL_IP_LIMIT",
        5,
      ),
      windowSeconds: readPositiveIntegerEnv(
        "RATE_LIMIT_ADMIN_SIGNIN_EMAIL_IP_WINDOW_SECONDS",
        900,
      ),
    } satisfies AdminSignInRateLimitPolicy;
  }

  return {
    limit: readPositiveIntegerEnv("RATE_LIMIT_ADMIN_SIGNIN_IP_LIMIT", 20),
    windowSeconds: readPositiveIntegerEnv(
      "RATE_LIMIT_ADMIN_SIGNIN_IP_WINDOW_SECONDS",
      900,
    ),
  } satisfies AdminSignInRateLimitPolicy;
}

function readHeaderValue(
  headers:
    | Headers
    | Record<string, string | string[] | undefined>
    | undefined
    | null,
  name: string,
) {
  if (!headers) {
    return null;
  }

  if (headers instanceof Headers) {
    return headers.get(name);
  }

  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return typeof value === "string" ? value : null;
}

export function readAdminSignInRequestIp(
  headers:
    | Headers
    | Record<string, string | string[] | undefined>
    | undefined
    | null,
) {
  const forwardedFor = readHeaderValue(headers, "x-forwarded-for");
  if (forwardedFor) {
    const [firstIp] = forwardedFor.split(",");
    const normalized = firstIp?.trim();
    if (normalized) {
      return normalized;
    }
  }

  const directIp =
    readHeaderValue(headers, "cf-connecting-ip") ??
    readHeaderValue(headers, "x-real-ip");

  const normalized = directIp?.trim();
  return normalized && normalized.length > 0 ? normalized : "unknown";
}

async function incrementFailureWindowCounter(input: {
  bucketKey: string;
  policy: AdminSignInRateLimitPolicy;
  scope: AdminSignInRateLimitScope;
  nowMs?: number;
}) {
  const store = await getMutationRateLimitStore();
  const nowMs = input.nowMs ?? Date.now();
  const bucketNumber = Math.floor(nowMs / (input.policy.windowSeconds * 1000));
  const count = await store.incrementWindowCounter({
    key: `${ADMIN_SIGNIN_RATE_LIMIT_KEY_PREFIX}:${input.bucketKey}:${bucketNumber}`,
    windowSeconds: input.policy.windowSeconds,
  });
  const resetAtMs = (bucketNumber + 1) * input.policy.windowSeconds * 1000;
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000));

  return {
    allowed: count <= input.policy.limit,
    limit: input.policy.limit,
    remaining: Math.max(0, input.policy.limit - count),
    resetAt: new Date(resetAtMs).toISOString(),
    retryAfterSeconds,
    scope: input.scope,
  } satisfies AdminSignInRateLimitDecision;
}

function formatRetryAfter(retryAfterSeconds: number) {
  if (retryAfterSeconds >= 3600) {
    const hours = Math.ceil(retryAfterSeconds / 3600);
    return `in about ${hours} hour${hours === 1 ? "" : "s"}`;
  }

  if (retryAfterSeconds >= 120) {
    const minutes = Math.ceil(retryAfterSeconds / 60);
    return `in about ${minutes} minutes`;
  }

  if (retryAfterSeconds >= 60) {
    return "in about 1 minute";
  }

  return `in about ${retryAfterSeconds} second${retryAfterSeconds === 1 ? "" : "s"}`;
}

export function getAdminSignInFailureMessage() {
  return DEFAULT_ADMIN_SIGNIN_FAILURE_MESSAGE;
}

export async function recordFailedAdminSignInAttempt(input: {
  email: string;
  headers:
    | Headers
    | Record<string, string | string[] | undefined>
    | undefined
    | null;
}) {
  const ipAddress = readAdminSignInRequestIp(input.headers);
  const decisions = await Promise.all([
    incrementFailureWindowCounter({
      bucketKey: `email-ip:${input.email}:${ipAddress}`,
      policy: getAdminSignInRateLimitPolicy("email_ip"),
      scope: "email_ip",
    }),
    incrementFailureWindowCounter({
      bucketKey: `ip:${ipAddress}`,
      policy: getAdminSignInRateLimitPolicy("ip"),
      scope: "ip",
    }),
  ]);

  const blockingDecisions = decisions.filter((decision) => !decision.allowed);
  if (blockingDecisions.length > 0) {
    throw new AdminSignInRateLimitError(blockingDecisions);
  }
}

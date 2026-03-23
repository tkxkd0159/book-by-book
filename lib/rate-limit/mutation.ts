import {
  env,
  type RateLimitProvider,
} from "@/lib/env";
import {
  getCacheBackend,
  resetCacheBackendForTests,
} from "@/lib/cache/backend";

export type MutationRateLimitAction =
  | "create-club"
  | "add-book"
  | "start-thread";

export type MutationRateLimitPolicy = {
  limit: number;
  windowSeconds: number;
};

export type MutationRateLimitDecision = {
  allowed: boolean;
  action: MutationRateLimitAction;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: string;
};

export type MutationRateLimitStore = {
  provider: RateLimitProvider;
  incrementWindowCounter(input: {
    key: string;
    windowSeconds: number;
  }): Promise<number>;
};

const DEFAULT_MUTATION_RATE_LIMIT_POLICIES = {
  "create-club": {
    limit: 3,
    windowSeconds: 600,
  },
  "add-book": {
    limit: 20,
    windowSeconds: 60,
  },
  "start-thread": {
    limit: 10,
    windowSeconds: 600,
  },
} satisfies Record<MutationRateLimitAction, MutationRateLimitPolicy>;

const ACTION_MESSAGES = {
  "create-club": "You're creating clubs too quickly.",
  "add-book": "You're adding books too quickly.",
  "start-thread": "You're starting threads too quickly.",
} satisfies Record<MutationRateLimitAction, string>;

const RATE_LIMIT_KEY_PREFIX = "bbb:ratelimit:v1";

let cachedStorePromise: Promise<MutationRateLimitStore> | null = null;

export class MutationRateLimitError extends Error {
  readonly action: MutationRateLimitAction;
  readonly decision: MutationRateLimitDecision;

  constructor(
    action: MutationRateLimitAction,
    decision: MutationRateLimitDecision,
  ) {
    super(
      `${ACTION_MESSAGES[action]} Please wait ${formatRetryAfter(
        decision.retryAfterSeconds,
      )} and try again.`,
    );
    this.name = "MutationRateLimitError";
    this.action = action;
    this.decision = decision;
  }
}

export function isMutationRateLimitError(
  error: unknown,
): error is MutationRateLimitError {
  return error instanceof MutationRateLimitError;
}

export function resolveMutationRateLimitProvider(): RateLimitProvider {
  return env.cache.provider;
}

export function getMutationRateLimitPolicy(
  action: MutationRateLimitAction,
): MutationRateLimitPolicy {
  const defaults = DEFAULT_MUTATION_RATE_LIMIT_POLICIES[action];
  const overrides = env.rateLimit.overrides;

  return {
    limit:
      (action === "create-club"
        ? overrides.createClubLimit
        : action === "add-book"
          ? overrides.addBookLimit
          : overrides.startThreadLimit) ?? defaults.limit,
    windowSeconds:
      (action === "create-club"
        ? overrides.createClubWindowSeconds
        : action === "add-book"
          ? overrides.addBookWindowSeconds
          : overrides.startThreadWindowSeconds) ?? defaults.windowSeconds,
  };
}

export async function getMutationRateLimitStore(): Promise<MutationRateLimitStore> {
  if (!cachedStorePromise) {
    cachedStorePromise = createMutationRateLimitStore();
  }

  return cachedStorePromise;
}

export async function checkMutationRateLimit(input: {
  action: MutationRateLimitAction;
  userId: string;
  nowMs?: number;
}): Promise<MutationRateLimitDecision> {
  const store = await getMutationRateLimitStore();
  const policy = getMutationRateLimitPolicy(input.action);
  const nowMs = input.nowMs ?? Date.now();
  const bucketNumber = Math.floor(nowMs / (policy.windowSeconds * 1000));
  const key = `${RATE_LIMIT_KEY_PREFIX}:${input.action}:${input.userId}:${bucketNumber}`;
  const count = await store.incrementWindowCounter({
    key,
    windowSeconds: policy.windowSeconds,
  });
  const resetAtMs = (bucketNumber + 1) * policy.windowSeconds * 1000;
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000));

  return {
    allowed: count <= policy.limit,
    action: input.action,
    limit: policy.limit,
    remaining: Math.max(0, policy.limit - count),
    retryAfterSeconds,
    resetAt: new Date(resetAtMs).toISOString(),
  };
}

export async function enforceMutationRateLimit(input: {
  action: MutationRateLimitAction;
  userId: string;
}) {
  const decision = await checkMutationRateLimit(input);
  if (!decision.allowed) {
    throw new MutationRateLimitError(input.action, decision);
  }

  return decision;
}

export function resetMemoryMutationRateLimitStore() {
  resetCacheBackendForTests();
  cachedStorePromise = null;
}

function formatRetryAfter(retryAfterSeconds: number) {
  if (retryAfterSeconds >= 3600) {
    const hours = Math.ceil(retryAfterSeconds / 3600);
    return `about ${hours} hour${hours === 1 ? "" : "s"}`;
  }

  if (retryAfterSeconds >= 120) {
    const minutes = Math.ceil(retryAfterSeconds / 60);
    return `about ${minutes} minutes`;
  }

  if (retryAfterSeconds >= 60) {
    return "about 1 minute";
  }

  return `about ${retryAfterSeconds} second${retryAfterSeconds === 1 ? "" : "s"}`;
}

async function createMutationRateLimitStore(): Promise<MutationRateLimitStore> {
  const backend = await getCacheBackend();

  return {
    provider: backend.provider,
    async incrementWindowCounter({ key, windowSeconds }) {
      if (backend.provider === "disabled") {
        return 0;
      }

      const firstWrite = await backend.set(key, "1", {
        onlyIfAbsent: true,
        ttlSeconds: windowSeconds,
      });

      if (firstWrite) {
        return 1;
      }

      const count = await backend.incr(key);
      const ttl = await backend.ttl(key);
      if (ttl === null || ttl < 0) {
        await backend.expire(key, windowSeconds);
      }

      return count;
    },
  };
}

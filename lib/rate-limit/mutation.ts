type RateLimitProvider = "upstash" | "redis" | "memory" | "disabled";

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

type MemoryRateLimitEntry = {
  count: number;
  expiresAtMs: number;
};

type GlobalRateLimitState = typeof globalThis & {
  __bbbMutationRateLimitMemoryStore?: Map<string, MemoryRateLimitEntry>;
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
  const rawValue = process.env.RATE_LIMIT_PROVIDER?.trim().toLowerCase();
  if (!rawValue) {
    return "disabled";
  }

  if (
    rawValue === "upstash" ||
    rawValue === "redis" ||
    rawValue === "memory" ||
    rawValue === "disabled"
  ) {
    if (rawValue === "memory" && isProductionLikeRuntime()) {
      throw new Error(
        "RATE_LIMIT_PROVIDER=memory is only supported in test and local development environments.",
      );
    }

    return rawValue;
  }

  throw new Error(
    "RATE_LIMIT_PROVIDER must be one of: upstash, redis, memory, disabled.",
  );
}

export function getMutationRateLimitPolicy(
  action: MutationRateLimitAction,
): MutationRateLimitPolicy {
  const defaults = DEFAULT_MUTATION_RATE_LIMIT_POLICIES[action];
  const prefix = action.replace(/-/g, "_").toUpperCase();

  return {
    limit:
      readPositiveIntegerEnv(`RATE_LIMIT_${prefix}_LIMIT`) ?? defaults.limit,
    windowSeconds:
      readPositiveIntegerEnv(`RATE_LIMIT_${prefix}_WINDOW_SECONDS`) ??
      defaults.windowSeconds,
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
  getMemoryStore().clear();
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

function isProductionLikeRuntime() {
  return (
    process.env.NODE_ENV === "production" && process.env.E2E_BYPASS_AUTH !== "1"
  );
}

function readPositiveIntegerEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

async function createMutationRateLimitStore(): Promise<MutationRateLimitStore> {
  const provider = resolveMutationRateLimitProvider();

  switch (provider) {
    case "disabled":
      return {
        provider,
        async incrementWindowCounter() {
          return 0;
        },
      };
    case "memory":
      return createMemoryMutationRateLimitStore();
    case "upstash":
      return createUpstashMutationRateLimitStore();
    case "redis":
      return createNodeRedisMutationRateLimitStore();
  }
}

function createMemoryMutationRateLimitStore(): MutationRateLimitStore {
  return {
    provider: "memory",
    async incrementWindowCounter({ key, windowSeconds }) {
      const store = getMemoryStore();
      const nowMs = Date.now();
      const existing = store.get(key);

      if (!existing || existing.expiresAtMs <= nowMs) {
        store.set(key, {
          count: 1,
          expiresAtMs: nowMs + windowSeconds * 1000,
        });
        return 1;
      }

      existing.count += 1;
      store.set(key, existing);
      return existing.count;
    },
  };
}

async function createUpstashMutationRateLimitStore(): Promise<MutationRateLimitStore> {
  const url = readRequiredEnv("UPSTASH_REDIS_REST_URL");
  const token = readRequiredEnv("UPSTASH_REDIS_REST_TOKEN");
  const { Redis } = await import("@upstash/redis");
  const client = new Redis({ url, token });

  return {
    provider: "upstash",
    async incrementWindowCounter({ key, windowSeconds }) {
      const setResult = await client.set(key, "1", {
        nx: true,
        ex: windowSeconds,
      });

      if (setResult === "OK") {
        return 1;
      }

      const count = await client.incr(key);
      const ttl = await client.ttl(key);
      if (typeof ttl !== "number" || ttl < 0) {
        await client.expire(key, windowSeconds);
      }

      return count;
    },
  };
}

async function createNodeRedisMutationRateLimitStore(): Promise<MutationRateLimitStore> {
  const url = readRequiredEnv("RATE_LIMIT_REDIS_URL");
  const { createClient } = await import("redis");
  const client = createClient({ url });

  client.on("error", (error) => {
    console.error("[rate-limit] Redis client error", error);
  });

  await client.connect();

  return {
    provider: "redis",
    async incrementWindowCounter({ key, windowSeconds }) {
      const setResult = await client.set(key, "1", {
        condition: "NX",
        expiration: {
          type: "EX",
          value: windowSeconds,
        },
      });

      if (setResult === "OK") {
        return 1;
      }

      const count = await client.incr(key);
      const ttl = await client.ttl(key);
      if (ttl < 0) {
        await client.expire(key, windowSeconds);
      }

      return count;
    },
  };
}

function readRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is required for the configured rate-limit provider.`,
    );
  }

  return value;
}

function getMemoryStore() {
  const globalState = globalThis as GlobalRateLimitState;
  if (!globalState.__bbbMutationRateLimitMemoryStore) {
    globalState.__bbbMutationRateLimitMemoryStore = new Map();
  }

  const store = globalState.__bbbMutationRateLimitMemoryStore;
  const nowMs = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAtMs <= nowMs) {
      store.delete(key);
    }
  }

  return store;
}

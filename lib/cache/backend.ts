import {
  env,
  type CacheEnv,
  type CacheProvider,
} from "@/lib/env";

type CacheSetOptions = {
  onlyIfAbsent?: boolean;
  ttlSeconds?: number;
};

export type CacheBackend = {
  provider: CacheProvider;
  del(key: string): Promise<void>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: CacheSetOptions): Promise<boolean>;
};

type InternalCacheBackend = CacheBackend & {
  incrementFixedWindowCounter(key: string, windowSeconds: number): Promise<number>;
};

type MemoryCacheEntry = {
  expiresAtMs: number | null;
  value: string;
};

type GlobalCacheState = typeof globalThis & {
  __bbbSharedCacheMemoryStore?: Map<string, MemoryCacheEntry>;
};

const globalCacheState = globalThis as GlobalCacheState;

let cachedBackendPromises = new Map<string, Promise<InternalCacheBackend>>();

export async function getCacheBackend(
  config: CacheEnv = env.cache,
): Promise<CacheBackend> {
  return getInternalCacheBackend(config);
}

export async function incrementFixedWindowCounter(
  key: string,
  windowSeconds: number,
  config: CacheEnv = env.cache,
) {
  const backend = await getInternalCacheBackend(config);
  return backend.incrementFixedWindowCounter(key, windowSeconds);
}

async function getInternalCacheBackend(
  config: CacheEnv = env.cache,
): Promise<InternalCacheBackend> {
  const cacheKey = JSON.stringify(config);
  const cachedPromise = cachedBackendPromises.get(cacheKey);
  if (cachedPromise) {
    return cachedPromise;
  }

  const backendPromise = createCacheBackend(config);
  cachedBackendPromises.set(cacheKey, backendPromise);
  return backendPromise;
}

export function resetCacheBackendForTests() {
  cachedBackendPromises = new Map();
  getMemoryStore().clear();
}

async function createCacheBackend(
  config: CacheEnv,
): Promise<InternalCacheBackend> {
  switch (config.provider) {
    case "disabled":
      return createDisabledCacheBackend();
    case "memory":
      return createMemoryCacheBackend();
    case "upstash":
      return createUpstashCacheBackend(config);
    case "redis":
      return createNodeRedisCacheBackend(config);
  }
}

function createDisabledCacheBackend(): InternalCacheBackend {
  return {
    provider: "disabled",
    async del() {},
    async get() {
      return null;
    },
    async incrementFixedWindowCounter() {
      return 0;
    },
    async set() {
      return false;
    },
  };
}

function createMemoryCacheBackend(): InternalCacheBackend {
  return {
    provider: "memory",
    async del(key) {
      getMemoryStore().delete(key);
    },
    async get(key) {
      return readMemoryEntry(getMemoryStore(), key)?.value ?? null;
    },
    async incrementFixedWindowCounter(key, windowSeconds) {
      const store = getMemoryStore();
      const entry = readMemoryEntry(store, key);
      const nowMs = Date.now();
      if (!entry) {
        store.set(key, {
          expiresAtMs: nowMs + windowSeconds * 1000,
          value: "1",
        });
        return 1;
      }

      const nextValue = Number.parseInt(entry.value, 10);
      store.set(key, {
        expiresAtMs: entry.expiresAtMs ?? nowMs + windowSeconds * 1000,
        value: String(Number.isNaN(nextValue) ? 1 : nextValue + 1),
      });
      return Number.isNaN(nextValue) ? 1 : nextValue + 1;
    },
    async set(key, value, options) {
      const store = getMemoryStore();
      const entry = readMemoryEntry(store, key);
      if (options?.onlyIfAbsent && entry) {
        return false;
      }

      store.set(key, {
        expiresAtMs:
          typeof options?.ttlSeconds === "number"
            ? Date.now() + options.ttlSeconds * 1000
            : null,
        value,
      });
      return true;
    },
  };
}

async function createUpstashCacheBackend(
  config: CacheEnv,
): Promise<InternalCacheBackend> {
  const { Redis } = await import("@upstash/redis");
  const client = new Redis({
    token: config.upstashRestToken!,
    url: config.upstashRestUrl!,
  });

  return {
    provider: "upstash",
    async del(key) {
      await client.del(key);
    },
    async get(key) {
      const value = await client.get<string>(key);
      return typeof value === "string" ? value : null;
    },
    async incrementFixedWindowCounter(key, windowSeconds) {
      const firstWrite = await client.set(key, "1", {
        ex: windowSeconds,
        nx: true,
      });
      if (firstWrite === "OK") {
        return 1;
      }

      const count = await client.incr(key);
      const ttl = await client.ttl(key);
      if (typeof ttl !== "number" || ttl < 0) {
        await client.expire(key, windowSeconds);
      }

      return count;
    },
    async set(key, value, options) {
      const setOptions =
        typeof options?.ttlSeconds === "number"
          ? options.onlyIfAbsent
            ? { ex: options.ttlSeconds, nx: true as const }
            : { ex: options.ttlSeconds }
          : options?.onlyIfAbsent
            ? { nx: true as const }
            : undefined;
      const result = setOptions
        ? await client.set(key, value, setOptions)
        : await client.set(key, value);
      return result === "OK";
    },
  };
}

async function createNodeRedisCacheBackend(
  config: CacheEnv,
): Promise<InternalCacheBackend> {
  const { createClient } = await import("redis");
  const client = createClient({
    url: config.redisUrl!,
  });

  client.on("error", (error) => {
    console.error("[cache] Redis client error", error);
  });

  await client.connect();

  return {
    provider: "redis",
    async del(key) {
      await client.del(key);
    },
    async get(key) {
      return client.get(key);
    },
    async incrementFixedWindowCounter(key, windowSeconds) {
      const firstWrite = await client.set(key, "1", {
        condition: "NX",
        expiration: {
          type: "EX",
          value: windowSeconds,
        },
      });
      if (firstWrite === "OK") {
        return 1;
      }

      const count = await client.incr(key);
      const ttl = await client.ttl(key);
      if (ttl < 0) {
        await client.expire(key, windowSeconds);
      }

      return count;
    },
    async set(key, value, options) {
      const result = await client.set(key, value, {
        condition: options?.onlyIfAbsent ? "NX" : undefined,
        expiration:
          typeof options?.ttlSeconds === "number"
            ? {
                type: "EX",
                value: options.ttlSeconds,
              }
            : undefined,
      });
      return result === "OK";
    },
  };
}

function getMemoryStore() {
  if (!globalCacheState.__bbbSharedCacheMemoryStore) {
    globalCacheState.__bbbSharedCacheMemoryStore = new Map();
  }

  return globalCacheState.__bbbSharedCacheMemoryStore;
}

function readMemoryEntry(store: Map<string, MemoryCacheEntry>, key: string) {
  const entry = store.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAtMs !== null && entry.expiresAtMs <= Date.now()) {
    store.delete(key);
    return null;
  }

  return entry;
}

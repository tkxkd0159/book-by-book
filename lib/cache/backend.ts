import {
  env,
  type CacheEnv,
  type CacheProvider,
} from "@/lib/env";

export type CacheSetOptions = {
  onlyIfAbsent?: boolean;
  ttlSeconds?: number;
};

export type CacheBackend = {
  provider: CacheProvider;
  del(key: string): Promise<void>;
  expire(key: string, ttlSeconds: number): Promise<void>;
  get(key: string): Promise<string | null>;
  incr(key: string): Promise<number>;
  set(key: string, value: string, options?: CacheSetOptions): Promise<boolean>;
  ttl(key: string): Promise<number | null>;
};

type MemoryCacheEntry = {
  expiresAtMs: number | null;
  value: string;
};

type GlobalCacheState = typeof globalThis & {
  __bbbSharedCacheMemoryStore?: Map<string, MemoryCacheEntry>;
};

const globalCacheState = globalThis as GlobalCacheState;

let cachedBackendPromises = new Map<string, Promise<CacheBackend>>();

export async function getCacheBackend(
  config: CacheEnv = env.cache,
): Promise<CacheBackend> {
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

async function createCacheBackend(config: CacheEnv): Promise<CacheBackend> {
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

function createDisabledCacheBackend(): CacheBackend {
  return {
    provider: "disabled",
    async del() {},
    async expire() {},
    async get() {
      return null;
    },
    async incr() {
      return 0;
    },
    async set() {
      return false;
    },
    async ttl() {
      return null;
    },
  };
}

function createMemoryCacheBackend(): CacheBackend {
  return {
    provider: "memory",
    async del(key) {
      getMemoryStore().delete(key);
    },
    async expire(key, ttlSeconds) {
      const store = getMemoryStore();
      const entry = readMemoryEntry(store, key);
      if (!entry) {
        return;
      }

      store.set(key, {
        ...entry,
        expiresAtMs: Date.now() + ttlSeconds * 1000,
      });
    },
    async get(key) {
      return readMemoryEntry(getMemoryStore(), key)?.value ?? null;
    },
    async incr(key) {
      const store = getMemoryStore();
      const entry = readMemoryEntry(store, key);
      const nextValue = entry ? Number.parseInt(entry.value, 10) + 1 : 1;
      store.set(key, {
        expiresAtMs: entry?.expiresAtMs ?? null,
        value: String(nextValue),
      });
      return nextValue;
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
    async ttl(key) {
      const entry = readMemoryEntry(getMemoryStore(), key);
      if (!entry?.expiresAtMs) {
        return null;
      }

      return Math.max(0, Math.ceil((entry.expiresAtMs - Date.now()) / 1000));
    },
  };
}

async function createUpstashCacheBackend(config: CacheEnv): Promise<CacheBackend> {
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
    async expire(key, ttlSeconds) {
      await client.expire(key, ttlSeconds);
    },
    async get(key) {
      const value = await client.get<string>(key);
      return typeof value === "string" ? value : null;
    },
    async incr(key) {
      return client.incr(key);
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
    async ttl(key) {
      const result = await client.ttl(key);
      return typeof result === "number" && result >= 0 ? result : null;
    },
  };
}

async function createNodeRedisCacheBackend(
  config: CacheEnv,
): Promise<CacheBackend> {
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
    async expire(key, ttlSeconds) {
      await client.expire(key, ttlSeconds);
    },
    async get(key) {
      return client.get(key);
    },
    async incr(key) {
      return client.incr(key);
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
    async ttl(key) {
      const result = await client.ttl(key);
      return result >= 0 ? result : null;
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

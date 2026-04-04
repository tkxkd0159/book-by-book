export type MemoryCacheEntry = {
  expiresAtMs: number | null;
  value: string;
};

type GlobalCacheState = typeof globalThis & {
  __bbbSharedCacheMemoryStore?: Map<string, MemoryCacheEntry>;
};

const globalCacheState = globalThis as GlobalCacheState;

export function getMemoryCacheStore() {
  if (!globalCacheState.__bbbSharedCacheMemoryStore) {
    globalCacheState.__bbbSharedCacheMemoryStore = new Map();
  }

  return globalCacheState.__bbbSharedCacheMemoryStore;
}

export function clearMemoryCacheStore() {
  globalCacheState.__bbbSharedCacheMemoryStore?.clear();
}

type TestHarnessGlobalState = typeof globalThis & {
  __bbbSharedCacheMemoryStore?: Map<string, unknown>;
};

const globalState = globalThis as TestHarnessGlobalState;

export function resetTestHarnessRuntimeState() {
  globalState.__bbbSharedCacheMemoryStore?.clear();
}

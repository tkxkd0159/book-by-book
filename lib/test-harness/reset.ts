import { clearMemoryCacheStore } from "@/lib/cache/memory-store";

export function resetTestHarnessState() {
  clearMemoryCacheStore();
}

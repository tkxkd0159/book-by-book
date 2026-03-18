import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { clearRuntimeState, readRuntimeState } from "./helpers/runtime";

const execFileAsync = promisify(execFile);

export default async function globalTeardown() {
  try {
    const state = await readRuntimeState();
    await execFileAsync("docker", ["rm", "-f", state.containerId]);
  } catch {
    // Best-effort cleanup; Testcontainers reaper can still handle leftovers.
  } finally {
    await clearRuntimeState().catch(() => undefined);
  }
}

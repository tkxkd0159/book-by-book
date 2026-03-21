import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  clearIntegrationRuntimeState,
  readIntegrationRuntimeState,
} from "./integration-runtime";

const execFileAsync = promisify(execFile);

export default async function teardownIntegrationDatabase() {
  try {
    const state = await readIntegrationRuntimeState();
    await execFileAsync("docker", ["rm", "-f", state.containerId]).catch(
      () => undefined,
    );
  } catch {
    // Best-effort cleanup; Testcontainers can still reclaim leftovers.
  } finally {
    await clearIntegrationRuntimeState().catch(() => undefined);
  }
}

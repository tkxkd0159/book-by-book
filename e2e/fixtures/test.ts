import { spawn } from "node:child_process";
import { once } from "node:events";

import { expect, test as base } from "@playwright/test";

import {
  E2E_SERVER_ENV,
  createDatabaseClone,
  createDatabaseUrl,
  createWorkerDatabaseName,
  createWorkerServerPort,
  dropDatabase,
  readRuntimeState,
  waitForServerReady,
} from "../helpers/runtime";

type WorkerApp = {
  baseUrl: string;
};

export const test = base.extend<Record<string, never>, { workerApp: WorkerApp }>({
  workerApp: [
    async ({}, useWorkerApp, workerInfo) => {
      const runtimeState = await readRuntimeState();
      const databaseName = createWorkerDatabaseName(
        workerInfo.project.name,
        workerInfo.parallelIndex,
      );
      const databaseUrl = createDatabaseUrl(
        runtimeState.adminDatabaseUrl,
        databaseName,
      );
      const port = createWorkerServerPort(
        workerInfo.project.name,
        workerInfo.parallelIndex,
      );
      const baseUrl = `http://localhost:${port}`;

      await createDatabaseClone({
        adminDatabaseUrl: runtimeState.adminDatabaseUrl,
        databaseName,
        templateDatabase: runtimeState.templateDatabase,
      });

      const logs: string[] = [];
      const server = spawn(
        "pnpm",
        ["exec", "next", "start", "--port", String(port)],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            ...E2E_SERVER_ENV,
            DATABASE_URL: databaseUrl,
            NEXTAUTH_URL: baseUrl,
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );

      server.stdout.on("data", (chunk: Buffer | string) => {
        logs.push(chunk.toString());
      });
      server.stderr.on("data", (chunk: Buffer | string) => {
        logs.push(chunk.toString());
      });

      try {
        await waitForServerReady({
          baseUrl,
          logs,
          serverName: `${workerInfo.project.name} worker ${workerInfo.parallelIndex}`,
          onExit: once(server, "exit").then(() => {
            throw new Error(logs.join(""));
          }),
        });

        await useWorkerApp({
          baseUrl,
        });
      } finally {
        if (server.exitCode === null && !server.killed) {
          server.kill("SIGTERM");
          await Promise.race([once(server, "exit"), new Promise((resolve) => setTimeout(resolve, 10_000))]);
          if (server.exitCode === null && !server.killed) {
            server.kill("SIGKILL");
          }
        }

        await dropDatabase({
          adminDatabaseUrl: runtimeState.adminDatabaseUrl,
          databaseName,
        }).catch(() => undefined);
      }
    },
    { scope: "worker" },
  ],

  baseURL: async ({ workerApp }, setBaseUrl) => {
    await setBaseUrl(workerApp.baseUrl);
  },
});

export { expect };

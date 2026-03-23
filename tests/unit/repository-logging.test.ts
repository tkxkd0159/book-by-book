import { Writable } from "node:stream";

import { describe, expect, it } from "vitest";

import { createLogger } from "@/lib/logger";
import { logRepositoryOperation } from "@/lib/repository-logging";

class CaptureStream extends Writable {
  readonly chunks: string[] = [];

  override _write(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ) {
    this.chunks.push(chunk.toString());
    callback();
  }
}

function parseLogs(stream: CaptureStream) {
  return stream.chunks
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

describe("repository logging", () => {
  it("emits debug start and success logs with sanitized context", async () => {
    const stream = new CaptureStream();
    const logger = createLogger({
      level: "debug",
      stream,
    });

    const result = await logRepositoryOperation(
      {
        context: {
          description: "secret description",
          googleVolumeIds: ["vol-1", "vol-2"],
          token: "hidden-token",
          userId: "user-1",
        },
        logger,
        module: "test.repository",
        operation: "demo",
      },
      async () => "ok",
    );

    const logs = parseLogs(stream);

    expect(result).toBe("ok");
    expect(logs).toHaveLength(2);
    expect(logs[0]).toMatchObject({
      context: {
        googleVolumeIds: ["vol-1", "vol-2"],
        userId: "user-1",
      },
      level: 20,
      module: "test.repository",
      operation: "demo",
      outcome: "start",
      transactional: false,
    });
    expect(logs[1]).toMatchObject({
      context: {
        googleVolumeIds: ["vol-1", "vol-2"],
        userId: "user-1",
      },
      level: 20,
      module: "test.repository",
      operation: "demo",
      outcome: "success",
      transactional: false,
    });
    expect(logs[1].durationMs).toBeTypeOf("number");
  });

  it("emits an error log when the repository operation fails", async () => {
    const stream = new CaptureStream();
    const logger = createLogger({
      level: "debug",
      stream,
    });

    await expect(
      logRepositoryOperation(
        {
          context: { userId: "user-1" },
          logger,
          module: "test.repository",
          operation: "failingDemo",
        },
        async () => {
          throw new Error("boom");
        },
      ),
    ).rejects.toThrow("boom");

    const logs = parseLogs(stream);

    expect(logs).toHaveLength(2);
    expect(logs[1]).toMatchObject({
      context: { userId: "user-1" },
      err: {
        message: "boom",
        type: "Error",
      },
      level: 50,
      module: "test.repository",
      operation: "failingDemo",
      outcome: "error",
    });
  });

  it("suppresses nested repository logs within the same async flow", async () => {
    const stream = new CaptureStream();
    const logger = createLogger({
      level: "debug",
      stream,
    });

    await logRepositoryOperation(
      {
        logger,
        module: "test.repository",
        operation: "outer",
      },
      async () =>
        logRepositoryOperation(
          {
            logger,
            module: "test.repository",
            operation: "inner",
          },
          async () => "nested-result",
        ),
    );

    const logs = parseLogs(stream);

    expect(logs).toHaveLength(2);
    expect(logs[0].operation).toBe("outer");
    expect(logs[1].operation).toBe("outer");
  });

  it("respects the configured logger level", async () => {
    const stream = new CaptureStream();
    const logger = createLogger({
      level: "info",
      stream,
    });

    await logRepositoryOperation(
      {
        logger,
        module: "test.repository",
        operation: "infoSuppressed",
      },
      async () => "ok",
    );

    expect(parseLogs(stream)).toHaveLength(0);
  });
});

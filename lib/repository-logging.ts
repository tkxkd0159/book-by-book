import { AsyncLocalStorage } from "node:async_hooks";

import type { Logger } from "pino";

import { logger } from "@/lib/logger";

type RepositoryLogValue =
  | string
  | number
  | boolean
  | null
  | RepositoryLogValue[]
  | {
      [key: string]: RepositoryLogValue;
    };

type RepositoryLogContext = Record<string, RepositoryLogValue>;

type RepositoryLogOptions = {
  context?: Record<string, unknown>;
  logger?: Logger;
  module: string;
  operation: string;
  transactional?: boolean;
};

// Suppress nested repository logs so composite repository flows emit one outer log span.
const REPOSITORY_LOG_SCOPE = new AsyncLocalStorage<{ active: true }>();
const SENSITIVE_KEY_PATTERN =
  /(email|name|title|description|body|note|token|secret|password|hash|nickname|raw|image|url|link)/i;
const ARRAY_PREVIEW_LIMIT = 10;

export function logRepositoryOperation<T>(
  options: RepositoryLogOptions,
  operation: () => T | Promise<T>,
): T | Promise<T> {
  if (REPOSITORY_LOG_SCOPE.getStore()) {
    return operation();
  }

  const operationLogger = (options.logger ?? logger).child({
    module: options.module,
    operation: options.operation,
    transactional: options.transactional ?? false,
  });
  const context = sanitizeRepositoryLogContext(options.context);
  const startedAt = process.hrtime.bigint();

  operationLogger.debug(
    {
      context,
      outcome: "start",
    },
    "Repository operation started",
  );

  return REPOSITORY_LOG_SCOPE.run({ active: true }, () => {
    try {
      const result = operation();

      if (isPromiseLike(result)) {
        return result.then(
          (value) => {
            operationLogger.debug(
              {
                context,
                durationMs: getDurationMs(startedAt),
                outcome: "success",
              },
              "Repository operation completed",
            );

            return value;
          },
          (error: unknown) => {
            operationLogger.error(
              {
                context,
                durationMs: getDurationMs(startedAt),
                err: error,
                outcome: "error",
              },
              "Repository operation failed",
            );

            throw error;
          },
        ) as T | Promise<T>;
      }

      operationLogger.debug(
        {
          context,
          durationMs: getDurationMs(startedAt),
          outcome: "success",
        },
        "Repository operation completed",
      );

      return result;
    } catch (error) {
      operationLogger.error(
        {
          context,
          durationMs: getDurationMs(startedAt),
          err: error,
          outcome: "error",
        },
        "Repository operation failed",
      );

      throw error;
    }
  });
}

function sanitizeRepositoryLogContext(
  context: Record<string, unknown> | undefined,
): RepositoryLogContext | undefined {
  if (!context) {
    return undefined;
  }

  const sanitized = sanitizeObject(context);
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function sanitizeObject(
  value: Record<string, unknown>,
): RepositoryLogContext {
  const sanitized: RepositoryLogContext = {};

  for (const [key, currentValue] of Object.entries(value)) {
    const normalizedValue = sanitizeValue(currentValue, key);

    if (normalizedValue !== undefined) {
      sanitized[key] = normalizedValue;
    }
  }

  return sanitized;
}

function sanitizeValue(
  value: unknown,
  key?: string,
): RepositoryLogValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (isSensitiveKey(key)) {
    return undefined;
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    const sanitizedItems = value
      .map((item) => sanitizeValue(item))
      .filter((item): item is RepositoryLogValue => item !== undefined);

    if (sanitizedItems.length <= ARRAY_PREVIEW_LIMIT) {
      return sanitizedItems;
    }

    return {
      count: sanitizedItems.length,
      truncated: true,
      values: sanitizedItems.slice(0, ARRAY_PREVIEW_LIMIT),
    };
  }

  if (typeof value === "object") {
    const sanitizedObject = sanitizeObject(
      value as Record<string, unknown>,
    );

    return Object.keys(sanitizedObject).length > 0
      ? sanitizedObject
      : undefined;
  }

  return String(value);
}

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof value === "object" && value !== null && "then" in value;
}

function isSensitiveKey(key: string | undefined) {
  return key ? SENSITIVE_KEY_PATTERN.test(key) : false;
}

function getDurationMs(startedAt: bigint) {
  return Number(process.hrtime.bigint() - startedAt) / 1_000_000;
}

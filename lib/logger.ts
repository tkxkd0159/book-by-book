import pino, { type DestinationStream, type Logger } from "pino";

import { env, type LogLevel } from "@/lib/env";

type CreateLoggerOptions = {
  level?: LogLevel;
  name?: string;
  stream?: DestinationStream;
};

export function createLogger(options: CreateLoggerOptions = {}): Logger {
  return pino(
    {
      level: options.level ?? env.logging.level,
      name: options.name,
    },
    options.stream,
  );
}

export const logger = createLogger({
  name: "book-by-book",
});

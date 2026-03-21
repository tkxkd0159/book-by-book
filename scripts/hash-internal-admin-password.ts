#!/usr/bin/env node

import process from "node:process";

import {
  hashInternalAdminPassword,
  parseInternalAdminPassword,
} from "../lib/auth/internal.ts";

const BCRYPT_MIN_SALT_ROUNDS = 4;
const BCRYPT_MAX_SALT_ROUNDS = 31;

function printUsage() {
  process.stderr.write(
    [
      "Usage: pnpm hash:internal-admin-password [--salt-rounds <number>]",
      "",
      "Reads the password from stdin when piped, otherwise prompts interactively.",
    ].join("\n") + "\n",
  );
}

function parseSaltRounds(argv: string[]) {
  let saltRounds: number | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }

    if (arg !== "--salt-rounds" && arg !== "-r") {
      throw new Error(`Unknown argument: ${arg}`);
    }

    const rawValue = argv[index + 1];
    if (!rawValue) {
      throw new Error("Missing value for --salt-rounds.");
    }

    const parsedValue = Number.parseInt(rawValue, 10);
    if (
      !Number.isInteger(parsedValue) ||
      parsedValue < BCRYPT_MIN_SALT_ROUNDS ||
      parsedValue > BCRYPT_MAX_SALT_ROUNDS
    ) {
      throw new Error(
        `--salt-rounds must be an integer between ${BCRYPT_MIN_SALT_ROUNDS} and ${BCRYPT_MAX_SALT_ROUNDS}.`,
      );
    }

    saltRounds = parsedValue;
    index += 1;
  }

  return saltRounds;
}

function trimSingleTrailingLineEnding(value: string) {
  return value.replace(/\r?\n$/, "");
}

async function readPipedPassword() {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return trimSingleTrailingLineEnding(Buffer.concat(chunks).toString("utf8"));
}

async function promptHidden(label: string) {
  if (!process.stdin.isTTY) {
    throw new Error("Interactive password prompt requires a TTY.");
  }

  return new Promise<string>((resolve, reject) => {
    let value = "";

    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.off("data", onData);
      process.stderr.write("\n");
    };

    const rejectWith = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onData = (chunk: Buffer | string) => {
      const input = typeof chunk === "string" ? chunk : chunk.toString("utf8");

      if (input === "\u0003") {
        rejectWith(new Error("Cancelled."));
        return;
      }

      if (input === "\r" || input === "\n") {
        cleanup();
        resolve(value);
        return;
      }

      if (input === "\u007f" || input === "\b") {
        value = value.slice(0, -1);
        return;
      }

      if (input.startsWith("\u001b")) {
        return;
      }

      const lineEndingIndex = input.search(/[\r\n]/);
      if (lineEndingIndex >= 0) {
        value += input.slice(0, lineEndingIndex);
        cleanup();
        resolve(value);
        return;
      }

      value += input;
    };

    process.stderr.write(label);
    process.stdin.setEncoding("utf8");
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", onData);
  });
}

async function readPassword() {
  if (!process.stdin.isTTY) {
    return readPipedPassword();
  }

  const password = await promptHidden("Password: ");
  const confirmation = await promptHidden("Confirm password: ");

  if (password !== confirmation) {
    throw new Error("Passwords did not match.");
  }

  return password;
}

try {
  const saltRounds = parseSaltRounds(process.argv.slice(2));
  const password = parseInternalAdminPassword(await readPassword());
  const passwordHash =
    typeof saltRounds === "number"
      ? await hashInternalAdminPassword(password, saltRounds)
      : await hashInternalAdminPassword(password);

  process.stdout.write(`${passwordHash}\n`);
} catch (error) {
  if (error instanceof Error) {
    process.stderr.write(`${error.message}\n`);
  } else {
    process.stderr.write("Unable to generate password hash.\n");
  }

  if (!(error instanceof Error && error.message === "Cancelled.")) {
    printUsage();
  }

  process.exit(1);
}

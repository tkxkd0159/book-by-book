import process from "node:process";

import bcrypt from "bcryptjs";

const DEFAULT_SALT_ROUNDS = 12;
const MIN_SALT_ROUNDS = 4;
const MAX_SALT_ROUNDS = 31;
const MAX_PASSWORD_LENGTH = 1024;

function readSaltRounds(value) {
  const saltRounds = Number.parseInt(value, 10);

  if (
    !Number.isInteger(saltRounds) ||
    saltRounds < MIN_SALT_ROUNDS ||
    saltRounds > MAX_SALT_ROUNDS
  ) {
    throw new Error(
      `Salt rounds must be an integer between ${MIN_SALT_ROUNDS} and ${MAX_SALT_ROUNDS}.`,
    );
  }

  return saltRounds;
}

try {
  const args = process.argv.slice(2);
  let password;
  let saltRounds = DEFAULT_SALT_ROUNDS;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--salt" || arg === "-s") {
      const value = args[index + 1];
      if (!value) {
        throw new Error("Salt rounds are required.");
      }

      saltRounds = readSaltRounds(value);
      index += 1;
      continue;
    }

    if (arg.startsWith("--salt=")) {
      saltRounds = readSaltRounds(arg.slice("--salt=".length));
      continue;
    }

    if (typeof password === "undefined") {
      password = arg;
      continue;
    }

    throw new Error("Only one password argument is supported.");
  }

  if (typeof password !== "string" || password.trim().length === 0) {
    throw new Error("Password is required.");
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new Error("Password is too long.");
  }

  process.stdout.write(`${await bcrypt.hash(password, saltRounds)}\n`);
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Unable to hash password."}\n`,
  );
  process.exit(1);
}

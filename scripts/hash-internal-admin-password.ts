#!/usr/bin/env node

import process from "node:process";

import {
  hashInternalAdminPassword,
  parseInternalAdminPassword,
} from "../lib/auth/internal.ts";

try {
  const password = parseInternalAdminPassword(process.argv[2]);
  process.stdout.write(`${await hashInternalAdminPassword(password)}\n`);
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Unable to hash password."}\n`,
  );
  process.exit(1);
}

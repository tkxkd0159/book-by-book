import { createRequire } from "node:module";

import { googleBooksHandlers } from "@/tests/support/msw/google-books-handlers";

const globalForGoogleBooksMsw = globalThis as typeof globalThis & {
  __bookByBookGoogleBooksMockStarted?: boolean;
};

export function startGoogleBooksMocking() {
  if (globalForGoogleBooksMsw.__bookByBookGoogleBooksMockStarted) {
    return;
  }

  const require = createRequire(import.meta.url);
  const { setupServer } = require("msw/node") as typeof import("msw/node");
  const googleBooksMockServer = setupServer(...googleBooksHandlers);

  googleBooksMockServer.listen({
    onUnhandledRequest: "bypass",
  });
  globalForGoogleBooksMsw.__bookByBookGoogleBooksMockStarted = true;
}

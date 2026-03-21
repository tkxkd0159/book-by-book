import { setupServer } from "msw/node";

import { googleBooksHandlers } from "@/tests/support/msw/google-books-handlers";

export const googleBooksMockServer = setupServer(...googleBooksHandlers);

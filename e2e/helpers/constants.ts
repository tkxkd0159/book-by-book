import { E2E_AUTH_COOKIE_NAME } from "../../lib/auth/constants";
import {
  E2E_DEFAULT_RETURN_TO,
  E2E_TEST_ROUTE_PATHS,
  TEST_BOOK_VOLUME_ID,
  TEST_USER_KEYS,
  type TestUserKey,
} from "../../lib/test/constants";

export { E2E_AUTH_COOKIE_NAME, E2E_DEFAULT_RETURN_TO, E2E_TEST_ROUTE_PATHS };

export type E2ETestUser = TestUserKey;

export const E2E_TEST_USERS = TEST_USER_KEYS;

export const E2E_ROUTE_PATHS = {
  booksSearch: "/books/search",
  clubs: "/clubs",
  clubsNew: "/clubs/new",
  fixtureBook: `/books/${TEST_BOOK_VOLUME_ID}`,
  me: "/me",
  meShelves: "/me/shelves",
  meShelvesNew: "/me/shelves/new",
  searchResults: "/books/search?advanced=1&isbn=9780140328721",
  signIn: "/signin",
} as const;

export const E2E_URL_PATTERNS = {
  clubDetail: /\/clubs\/[0-9a-f-]+(?:\/board)?(?:\?|$)/i,
  clubBoard: /\/clubs\/[0-9a-f-]+\/board(?:\?|$)/i,
  clubMembers: /\/clubs\/[0-9a-f-]+\/members(?:\?|$)/i,
  manageMembers: /\/clubs\/[0-9a-f-]+\/manage\/members(?:\?|$)/i,
  myShelfDetail: /\/me\/shelves\/[0-9a-f-]+(?:\?|$)/i,
  publicShelf: /\/users\/[0-9a-f-]+\/shelves\/[0-9a-f-]+(?:\?|$)/i,
  discussionPath: /^\/clubs\/([^/]+)\/books\/([^/]+)$/i,
  threadPath: /^\/clubs\/([^/]+)\/threads\/([^/]+)$/i,
} as const;

export const E2E_TAB_LABELS = {
  manage: "Manage",
  members: "Members",
  readingBoard: "Reading board",
  invite: "Invite",
} as const;

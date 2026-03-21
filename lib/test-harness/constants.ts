export const TEST_USER_KEYS = ["owner", "member", "stranger"] as const;

export type TestUserKey = (typeof TEST_USER_KEYS)[number];

export const TEST_USERS = {
  owner: {
    email: "owner@book-by-book.test",
    key: "owner",
    name: "Owner Reader",
  },
  member: {
    email: "member@book-by-book.test",
    key: "member",
    name: "Member Reader",
  },
  stranger: {
    email: "stranger@book-by-book.test",
    key: "stranger",
    name: "Stranger Reader",
  },
} as const satisfies Record<
  TestUserKey,
  {
    email: string;
    key: TestUserKey;
    name: string;
  }
>;

export const TEST_FIXTURE_LOCK_ID = 20_260_316;

export const E2E_TEST_ROUTE_PATHS = {
  auth: "/api/test/auth",
  reset: "/api/test/reset",
  threads: "/api/test/threads",
} as const;

export const E2E_DEFAULT_RETURN_TO = "/clubs";

export const TEST_ROUTE_ERROR_MESSAGES = {
  invalidSeedPayload: "Invalid seed payload.",
  notAvailable: "Not available.",
  unknownTestUser: "Unknown test user.",
} as const;

export function isTestUserKey(value: string): value is TestUserKey {
  return TEST_USER_KEYS.some((userKey) => userKey === value);
}

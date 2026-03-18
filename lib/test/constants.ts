export const TEST_USER_KEYS = ["owner", "member", "stranger"] as const;

export type TestUserKey = (typeof TEST_USER_KEYS)[number];

export const TEST_USERS = {
  owner: {
    key: "owner",
    email: "owner@book-by-book.test",
    name: "Owner Reader",
  },
  member: {
    key: "member",
    email: "member@book-by-book.test",
    name: "Member Reader",
  },
  stranger: {
    key: "stranger",
    email: "stranger@book-by-book.test",
    name: "Stranger Reader",
  },
} as const satisfies Record<
  TestUserKey,
  {
    key: TestUserKey;
    email: string;
    name: string;
  }
>;

export const TEST_FIXTURE_LOCK_ID = 20_260_316;

export const TEST_BOOK_FIXTURE = {
  googleVolumeId: "club-test-book",
  title: "The Test-Driven Book Club",
  subtitle: "Milestone Fixture",
  authors: ["Fixture Author"],
  publisher: "Book by Book Press",
  publishedDate: "2025",
  description: "Fixture description for milestone 2 end-to-end coverage.",
  isbn13: "9780000000002",
  pageCount: 320,
  categories: ["Fiction"],
  language: "en",
  thumbnailUrl:
    "https://books.google.com/books/content?id=fixture&printsec=frontcover&img=1&zoom=1",
  infoLink: "https://books.google.com/books?id=fixture",
  canonicalLink: "https://books.google.com/books?id=fixture",
  rawGoogleJson: "{}",
} as const;

export const TEST_BOOK_VOLUME_ID = TEST_BOOK_FIXTURE.googleVolumeId;

export const E2E_TEST_ROUTE_PATHS = {
  auth: "/api/test/auth",
  reset: "/api/test/reset",
  threads: "/api/test/threads",
} as const;

export const E2E_DEFAULT_RETURN_TO = "/clubs";

export const TEST_ROUTE_ERROR_MESSAGES = {
  notAvailable: "Not available.",
  unknownTestUser: "Unknown test user.",
  invalidSeedPayload: "Invalid seed payload.",
} as const;

export function isTestUserKey(value: string): value is TestUserKey {
  return TEST_USER_KEYS.some((userKey) => userKey === value);
}

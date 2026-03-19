import type { NormalizedBook } from "@/lib/books/types";

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

type TestBookFixture = NormalizedBook;

export const TEST_BOOK_FIXTURE = {
  googleVolumeId: "club-test-book",
  title: "The Test-Driven Book Club",
  subtitle: "Milestone Fixture",
  authors: ["Fixture Author"],
  publisher: "Book by Book Press",
  publishedDate: "2025",
  description: "Fixture description for milestone 2 end-to-end coverage.",
  isbn10: null,
  isbn13: "9780000000002",
  pageCount: 320,
  categories: ["Fiction"],
  language: "en",
  thumbnailUrl:
    "https://books.google.com/books/content?id=fixture&printsec=frontcover&img=1&zoom=1",
  previewLink: null,
  infoLink: "https://books.google.com/books?id=fixture",
  canonicalLink: "https://books.google.com/books?id=fixture",
  rawGoogleJson: {
    id: "fixture",
    source: "test-fixture",
  },
} as const satisfies TestBookFixture;

export const E2E_SEARCH_RESULT_FIXTURE = {
  googleVolumeId: "fixture-search-matilda",
  title: "Matilda",
  subtitle: null,
  authors: ["Roald Dahl"],
  publisher: "Puffin Books",
  publishedDate: "2007",
  description: "A brilliant child discovers she can reshape the world around her.",
  isbn10: "0142410373",
  isbn13: "9780140328721",
  pageCount: 256,
  categories: ["Fiction", "Children"],
  language: "en",
  thumbnailUrl:
    "https://books.google.com/books/content?id=fixture-search-matilda&printsec=frontcover&img=1&zoom=1",
  previewLink: "https://books.google.com/books?id=fixture-search-matilda&printsec=frontcover",
  infoLink: "https://books.google.com/books?id=fixture-search-matilda",
  canonicalLink: "https://books.google.com/books?id=fixture-search-matilda",
  rawGoogleJson: {
    id: "fixture-search-matilda",
    source: "test-fixture",
  },
} as const satisfies TestBookFixture;

export const TEST_BOOK_CATALOG = [
  TEST_BOOK_FIXTURE,
  E2E_SEARCH_RESULT_FIXTURE,
  {
    googleVolumeId: "fixture-search-harry-potter",
    title: "Harry Potter and the Sorcerer's Stone",
    subtitle: null,
    authors: ["J.K. Rowling"],
    publisher: "Scholastic",
    publishedDate: "1998",
    description: "A young wizard discovers a hidden world at Hogwarts.",
    isbn10: "059035342X",
    isbn13: "9780590353427",
    pageCount: 320,
    categories: ["Fantasy"],
    language: "en",
    thumbnailUrl:
      "https://books.google.com/books/content?id=fixture-search-harry-potter&printsec=frontcover&img=1&zoom=1",
    previewLink:
      "https://books.google.com/books?id=fixture-search-harry-potter&printsec=frontcover",
    infoLink: "https://books.google.com/books?id=fixture-search-harry-potter",
    canonicalLink:
      "https://books.google.com/books?id=fixture-search-harry-potter",
    rawGoogleJson: {
      id: "fixture-search-harry-potter",
      source: "test-fixture",
    },
  },
  {
    googleVolumeId: "fixture-search-cosmos",
    title: "Cosmos",
    subtitle: "A Personal Voyage",
    authors: ["Carl Sagan"],
    publisher: "Ballantine Books",
    publishedDate: "1985",
    description: "Carl Sagan surveys the universe with clarity and wonder.",
    isbn10: "0345331354",
    isbn13: "9780345331357",
    pageCount: 384,
    categories: ["Science"],
    language: "en",
    thumbnailUrl:
      "https://books.google.com/books/content?id=fixture-search-cosmos&printsec=frontcover&img=1&zoom=1",
    previewLink:
      "https://books.google.com/books?id=fixture-search-cosmos&printsec=frontcover",
    infoLink: "https://books.google.com/books?id=fixture-search-cosmos",
    canonicalLink: "https://books.google.com/books?id=fixture-search-cosmos",
    rawGoogleJson: {
      id: "fixture-search-cosmos",
      source: "test-fixture",
    },
  },
  {
    googleVolumeId: "fixture-search-pride-prejudice",
    title: "Pride and Prejudice",
    subtitle: null,
    authors: ["Jane Austen"],
    publisher: "Modern Library",
    publishedDate: "2000",
    description:
      "Elizabeth Bennet and Mr. Darcy navigate pride, prejudice, and family expectations.",
    isbn10: "0679783261",
    isbn13: "9780679783268",
    pageCount: 279,
    categories: ["Classics", "Romance"],
    language: "en",
    thumbnailUrl:
      "https://books.google.com/books/content?id=fixture-search-pride-prejudice&printsec=frontcover&img=1&zoom=1",
    previewLink:
      "https://books.google.com/books?id=fixture-search-pride-prejudice&printsec=frontcover",
    infoLink:
      "https://books.google.com/books?id=fixture-search-pride-prejudice",
    canonicalLink:
      "https://books.google.com/books?id=fixture-search-pride-prejudice",
    rawGoogleJson: {
      id: "fixture-search-pride-prejudice",
      source: "test-fixture",
    },
  },
] as const satisfies readonly TestBookFixture[];

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

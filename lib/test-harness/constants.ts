import type { FavoriteGenreKey, UserGender } from "@/types/db";

export const TEST_USER_KEYS = ["owner", "member", "stranger", "incomplete"] as const;

export type TestUserKey = (typeof TEST_USER_KEYS)[number];

export const TEST_USERS = {
  owner: {
    email: "owner@book-by-book.test",
    favoriteGenres: ["FANTASY", "SCIENCE"] as FavoriteGenreKey[],
    gender: "MAN" as UserGender,
    key: "owner",
    name: "Owner Reader",
    nickname: "owner-reader",
    countryCode: "US",
  },
  member: {
    email: "member@book-by-book.test",
    favoriteGenres: ["MEMOIR", "TRAVEL"] as FavoriteGenreKey[],
    gender: "WOMAN" as UserGender,
    key: "member",
    name: "Member Reader",
    nickname: "member-reader",
    countryCode: "KR",
  },
  stranger: {
    email: "stranger@book-by-book.test",
    favoriteGenres: ["HISTORY", "PHILOSOPHY"] as FavoriteGenreKey[],
    gender: "NON_BINARY" as UserGender,
    key: "stranger",
    name: "Stranger Reader",
    nickname: "stranger-reader",
    countryCode: "CA",
  },
  incomplete: {
    email: "incomplete@book-by-book.test",
    favoriteGenres: [] as FavoriteGenreKey[],
    gender: null,
    key: "incomplete",
    name: "Incomplete Reader",
    nickname: null,
    countryCode: null,
  },
} as const satisfies Record<
  TestUserKey,
  {
    email: string;
    favoriteGenres: FavoriteGenreKey[];
    gender: UserGender | null;
    key: TestUserKey;
    name: string;
    nickname: string | null;
    countryCode: string | null;
  }
>;

export const TEST_INTERNAL_ADMIN = {
  email: "admin@book-by-book.test",
  name: "Internal Admin",
  password: "internal-secret",
} as const;

export const TEST_FIXTURE_LOCK_ID = 20_260_316;

export const E2E_TEST_ROUTE_PATHS = {
  auth: "/api/test/auth",
  clubBooks: "/api/test/club-books",
  invitationCodes: "/api/test/invitation-codes",
  reset: "/api/test/reset",
  reviews: "/api/test/reviews",
  shelves: "/api/test/shelves",
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

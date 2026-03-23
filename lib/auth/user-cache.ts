import { getCacheBackend } from "@/lib/cache/backend";
import type {
  AuthUser,
  FavoriteGenreKey,
  UserGender,
} from "@/types/db";

const AUTH_USER_CACHE_KEY_PREFIX = "bbb:auth-user:v1";
const AUTH_USER_CACHE_HIT_TTL_SECONDS = 60;
const AUTH_USER_CACHE_MISS_TTL_SECONDS = 15;

const FAVORITE_GENRE_KEYS = new Set([
  "FANTASY",
  "SCI_FI",
  "MYSTERY_CRIME",
  "THRILLER_SUSPENSE",
  "ROMANCE",
  "HISTORICAL_FICTION",
  "HORROR",
  "LITERARY_FICTION",
  "BIOGRAPHY_AUTOBIOGRAPHY",
  "MEMOIR",
  "HISTORY",
  "TRUE_CRIME",
  "PERSONAL_DEVELOPMENT",
  "SCIENCE",
  "PHILOSOPHY",
  "TRAVEL",
  "BUSINESS_ECONOMICS",
  "COOKING_FOOD",
  "ESSAYS_JOURNALISM",
]);
const USER_GENDERS = new Set([
  "MAN",
  "WOMAN",
  "NON_BINARY",
  "PREFER_NOT_TO_SAY",
]);

type CachedAuthUserPayload =
  | {
      kind: "hit";
      user: SerializedAuthUser;
      version: 1;
    }
  | {
      kind: "miss";
      version: 1;
    };

type SerializedAuthUser = {
  countryCode: string | null;
  email: string | null;
  favoriteGenres: FavoriteGenreKey[];
  gender: UserGender | null;
  id: string;
  imageUrl: string | null;
  name: string | null;
  nickname: string | null;
  provider: string;
  providerUserId: string;
  signupCompletedAt: string | null;
};

export async function readCachedAuthUserById(userId: string) {
  try {
    const backend = await getCacheBackend();
    if (backend.provider === "disabled") {
      return undefined;
    }

    const value = await backend.get(getAuthUserCacheKey(userId));
    if (value === null) {
      return undefined;
    }

    const payload = parseCachedAuthUserPayload(value);
    if (!payload) {
      await backend.del(getAuthUserCacheKey(userId));
      return undefined;
    }

    if (payload.kind === "miss") {
      return null;
    }

    const user = deserializeAuthUser(payload.user);
    if (!user) {
      await backend.del(getAuthUserCacheKey(userId));
      return undefined;
    }

    return user;
  } catch (error) {
    console.error("[auth] Failed to read cached auth user. Falling back to DB.", error);
    return undefined;
  }
}

export async function syncCachedAuthUser(
  userId: string,
  user: AuthUser | null,
) {
  try {
    const backend = await getCacheBackend();
    if (backend.provider === "disabled") {
      return;
    }

    const payload: CachedAuthUserPayload =
      user === null
        ? {
            kind: "miss",
            version: 1,
          }
        : {
            kind: "hit",
            user: serializeAuthUser(user),
            version: 1,
          };

    await backend.set(
      getAuthUserCacheKey(userId),
      JSON.stringify(payload),
      {
        ttlSeconds:
          user === null
            ? AUTH_USER_CACHE_MISS_TTL_SECONDS
            : AUTH_USER_CACHE_HIT_TTL_SECONDS,
      },
    );
  } catch (error) {
    console.error("[auth] Failed to write auth user cache entry.", error);
  }
}

function getAuthUserCacheKey(userId: string) {
  return `${AUTH_USER_CACHE_KEY_PREFIX}:${userId}`;
}

function serializeAuthUser(user: AuthUser): SerializedAuthUser {
  return {
    countryCode: user.countryCode,
    email: user.email,
    favoriteGenres: [...user.favoriteGenres],
    gender: user.gender,
    id: user.id,
    imageUrl: user.imageUrl,
    name: user.name,
    nickname: user.nickname,
    provider: user.provider,
    providerUserId: user.providerUserId,
    signupCompletedAt: user.signupCompletedAt?.toISOString() ?? null,
  };
}

function deserializeAuthUser(user: SerializedAuthUser): AuthUser | null {
  if (
    !isString(user.id) ||
    !isString(user.provider) ||
    !isString(user.providerUserId) ||
    !isNullableString(user.email) ||
    !isNullableString(user.name) ||
    !isNullableString(user.imageUrl) ||
    !isNullableString(user.nickname) ||
    !isNullableString(user.countryCode) ||
    !isValidGender(user.gender) ||
    !isValidFavoriteGenres(user.favoriteGenres) ||
    !isNullableString(user.signupCompletedAt)
  ) {
    return null;
  }

  const signupCompletedAt = user.signupCompletedAt
    ? new Date(user.signupCompletedAt)
    : null;
  if (signupCompletedAt && Number.isNaN(signupCompletedAt.valueOf())) {
    return null;
  }

  return {
    countryCode: user.countryCode,
    email: user.email,
    favoriteGenres: [...user.favoriteGenres],
    gender: user.gender,
    id: user.id,
    imageUrl: user.imageUrl,
    name: user.name,
    nickname: user.nickname,
    provider: user.provider,
    providerUserId: user.providerUserId,
    signupCompletedAt,
  };
}

function parseCachedAuthUserPayload(value: string): CachedAuthUserPayload | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    if (
      "version" in parsed &&
      parsed.version === 1 &&
      "kind" in parsed &&
      parsed.kind === "miss"
    ) {
      return {
        kind: "miss",
        version: 1,
      };
    }

    if (
      "version" in parsed &&
      parsed.version === 1 &&
      "kind" in parsed &&
      parsed.kind === "hit" &&
      "user" in parsed &&
      parsed.user &&
      typeof parsed.user === "object"
    ) {
      return {
        kind: "hit",
        user: parsed.user as SerializedAuthUser,
        version: 1,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isValidFavoriteGenres(value: unknown): value is FavoriteGenreKey[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => isString(entry) && FAVORITE_GENRE_KEYS.has(entry))
  );
}

function isValidGender(value: unknown): value is UserGender | null {
  return value === null || (isString(value) && USER_GENDERS.has(value));
}

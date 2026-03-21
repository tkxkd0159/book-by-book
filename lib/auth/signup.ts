import type { FavoriteGenre, UserGender } from "@/types/db";

export const USER_GENDERS = [
  "MAN",
  "WOMAN",
  "NON_BINARY",
  "PREFER_NOT_TO_SAY",
] as const satisfies readonly UserGender[];

export const FAVORITE_GENRE_GROUPS = [
  {
    label: "Fiction",
    genres: [
      "Fantasy",
      "Sci-Fi",
      "Mystery & Crime",
      "Thriller & suspense",
      "Romance",
      "Historical Fiction",
      "Horror",
      "Literary Fiction",
    ],
  },
  {
    label: "Non-Fiction",
    genres: [
      "Biography & Autobiography",
      "Memoir",
      "History",
      "True Crime",
      "Personal Development",
      "Science",
      "Philosophy",
      "Travel",
      "Business & Economics",
      "Cooking & Food",
      "Essays & Journalism",
    ],
  },
] as const satisfies ReadonlyArray<{
  label: string;
  genres: readonly FavoriteGenre[];
}>;

export const FAVORITE_GENRES = FAVORITE_GENRE_GROUPS.flatMap(
  (group) => group.genres,
) as FavoriteGenre[];

export const NICKNAME_PATTERN = /^[a-z0-9_-]{3,20}$/;

const USER_GENDER_SET = new Set<UserGender>(USER_GENDERS);
const FAVORITE_GENRE_SET = new Set<FavoriteGenre>(FAVORITE_GENRES);
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;
const COUNTRY_DISPLAY_NAMES = new Intl.DisplayNames(["en"], { type: "region" });

const COUNTRY_OPTIONS = Array.from({ length: 26 }, (_, firstIndex) =>
  Array.from({ length: 26 }, (_, secondIndex) => {
    const firstLetter = String.fromCharCode(65 + firstIndex);
    const secondLetter = String.fromCharCode(65 + secondIndex);
    return `${firstLetter}${secondLetter}`;
  }),
)
  .flat()
  .filter((code) => isSupportedCountryCode(code))
  .map((code) => ({
    code,
    name: COUNTRY_DISPLAY_NAMES.of(code) ?? code,
  }))
  .sort((left, right) => left.name.localeCompare(right.name));

export class SignupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SignupValidationError";
  }
}

function readString(value: FormDataEntryValue | string | null | undefined) {
  return typeof value === "string" ? value : "";
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

export function normalizeNickname(
  value: FormDataEntryValue | string | null | undefined,
) {
  return readString(value).trim().toLowerCase();
}

export function parseNickname(
  value: FormDataEntryValue | string | null | undefined,
) {
  const normalized = normalizeNickname(value);

  if (!normalized) {
    throw new SignupValidationError("Nickname is required.");
  }

  if (!NICKNAME_PATTERN.test(normalized)) {
    throw new SignupValidationError(
      "Nickname must be 3-20 characters using lowercase letters, numbers, underscores, or hyphens.",
    );
  }

  return normalized;
}

export function coerceUserGender(
  value: FormDataEntryValue | string | null | undefined,
): UserGender | null {
  const normalized = normalizeOptionalText(readString(value)?.toUpperCase());

  if (!normalized) {
    return null;
  }

  return USER_GENDER_SET.has(normalized as UserGender)
    ? (normalized as UserGender)
    : null;
}

export function parseUserGender(
  value: FormDataEntryValue | string | null | undefined,
) {
  const normalized = coerceUserGender(value);

  if (!normalized) {
    throw new SignupValidationError("Choose a valid gender.");
  }

  return normalized;
}

export function normalizeCountryCode(
  value: FormDataEntryValue | string | null | undefined,
) {
  return readString(value).trim().toUpperCase();
}

export function isSupportedCountryCode(countryCode: string) {
  if (!COUNTRY_CODE_PATTERN.test(countryCode)) {
    return false;
  }

  const label = COUNTRY_DISPLAY_NAMES.of(countryCode);
  return Boolean(label && label !== countryCode && label !== "Unknown Region");
}

export function parseCountryCode(
  value: FormDataEntryValue | string | null | undefined,
) {
  const normalized = normalizeCountryCode(value);

  if (!normalized) {
    throw new SignupValidationError("Choose a country.");
  }

  if (!isSupportedCountryCode(normalized)) {
    throw new SignupValidationError("Choose a valid country.");
  }

  return normalized;
}

export function getCountryName(countryCode: string | null | undefined) {
  if (!countryCode) {
    return null;
  }

  return COUNTRY_DISPLAY_NAMES.of(countryCode) ?? null;
}

export function listSupportedCountryOptions() {
  return COUNTRY_OPTIONS;
}

export function isFavoriteGenre(value: string): value is FavoriteGenre {
  return FAVORITE_GENRE_SET.has(value as FavoriteGenre);
}

export function coerceFavoriteGenres(
  values: readonly string[] | null | undefined,
): FavoriteGenre[] {
  if (!values) {
    return [];
  }

  const deduped = new Set<FavoriteGenre>();
  for (const value of values) {
    const normalized = normalizeOptionalText(value);
    if (normalized && isFavoriteGenre(normalized)) {
      deduped.add(normalized);
    }
  }

  return [...deduped];
}

export function parseFavoriteGenres(
  values: readonly (FormDataEntryValue | string)[] | null | undefined,
) {
  const normalized = coerceFavoriteGenres(
    (values ?? []).map((value) => readString(value)),
  );

  if (normalized.length === 0) {
    throw new SignupValidationError("Choose at least one favorite genre.");
  }

  return normalized;
}

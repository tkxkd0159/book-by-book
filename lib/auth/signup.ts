import type { FavoriteGenreKey, UserGender } from "@/types/db";

export const USER_GENDERS = [
  "MAN",
  "WOMAN",
  "PREFER_NOT_TO_SAY",
] as const satisfies readonly UserGender[];

export const FAVORITE_GENRE_GROUPS = [
  {
    label: "Fiction",
    genres: [
      { key: "FANTASY", label: "Fantasy" },
      { key: "SCI_FI", label: "Sci-Fi" },
      { key: "MYSTERY_CRIME", label: "Mystery & Crime" },
      { key: "THRILLER_SUSPENSE", label: "Thriller & suspense" },
      { key: "ROMANCE", label: "Romance" },
      { key: "HISTORICAL_FICTION", label: "Historical Fiction" },
      { key: "HORROR", label: "Horror" },
      { key: "LITERARY_FICTION", label: "Literary Fiction" },
    ],
  },
  {
    label: "Non-Fiction",
    genres: [
      {
        key: "BIOGRAPHY_AUTOBIOGRAPHY",
        label: "Biography & Autobiography",
      },
      { key: "MEMOIR", label: "Memoir" },
      { key: "HISTORY", label: "History" },
      { key: "TRUE_CRIME", label: "True Crime" },
      { key: "PERSONAL_DEVELOPMENT", label: "Personal Development" },
      { key: "SCIENCE", label: "Science" },
      { key: "PHILOSOPHY", label: "Philosophy" },
      { key: "TRAVEL", label: "Travel" },
      { key: "BUSINESS_ECONOMICS", label: "Business & Economics" },
      { key: "COOKING_FOOD", label: "Cooking & Food" },
      { key: "ESSAYS_JOURNALISM", label: "Essays & Journalism" },
    ],
  },
] as const satisfies ReadonlyArray<{
  label: string;
  genres: ReadonlyArray<{
    key: FavoriteGenreKey;
    label: string;
  }>;
}>;

export const FAVORITE_GENRES = FAVORITE_GENRE_GROUPS.flatMap((group) =>
  group.genres.map((genre) => genre.key),
) as FavoriteGenreKey[];

export const NICKNAME_PATTERN = /^[a-z0-9_-]{3,20}$/;

const USER_GENDER_SET = new Set<UserGender>(USER_GENDERS);
const FAVORITE_GENRE_SET = new Set<FavoriteGenreKey>(FAVORITE_GENRES);
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;
const COUNTRY_DISPLAY_NAMES = new Intl.DisplayNames(["en"], { type: "region" });
const FAVORITE_GENRE_LABELS = new Map<FavoriteGenreKey, string>(
  FAVORITE_GENRE_GROUPS.flatMap((group) =>
    group.genres.map((genre) => [genre.key, genre.label] as const),
  ),
);

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

export function isFavoriteGenreKey(value: string): value is FavoriteGenreKey {
  return FAVORITE_GENRE_SET.has(value as FavoriteGenreKey);
}

export function coerceFavoriteGenres(
  values: readonly string[] | null | undefined,
): FavoriteGenreKey[] {
  if (!values) {
    return [];
  }

  const deduped = new Set<FavoriteGenreKey>();
  for (const value of values) {
    const normalized = normalizeOptionalText(value)
      ?.toUpperCase()
      .replace(/\s+/g, "_");
    if (normalized && isFavoriteGenreKey(normalized)) {
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

export function getFavoriteGenreLabel(genreKey: FavoriteGenreKey) {
  return FAVORITE_GENRE_LABELS.get(genreKey) ?? genreKey;
}

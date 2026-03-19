import type { BookSearchMode } from "@/lib/books/types";
import { GoogleBooksQueryValidationError } from "@/lib/books/errors";

const DEFAULT_SEARCH_PAGE_SIZE = 18;
const GOOGLE_BOOKS_MAX_RESULTS = 40;
const ADVANCED_SEARCH_PREFIXES = new Set([
  "intitle",
  "inauthor",
  "inpublisher",
  "subject",
  "isbn",
]);

export function normalizeBasicQuery(query: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return "";
  }

  let normalized = "";
  let inQuotes = false;
  let previousWasWhitespace = false;

  for (const character of trimmed) {
    if (character === '"') {
      inQuotes = !inQuotes;
      normalized += character;
      previousWasWhitespace = false;
      continue;
    }

    if (!inQuotes && /\s/.test(character)) {
      if (!previousWasWhitespace) {
        normalized += " ";
        previousWasWhitespace = true;
      }
      continue;
    }

    normalized += character;
    previousWasWhitespace = false;
  }

  return normalized.trim();
}

export function buildTitleOnlySearchQuery(normalizedQuery: string) {
  const escaped = normalizedQuery.replace(/"/g, '\\"');
  return `intitle:"${escaped}"`;
}

export function buildBasicSearchQuery(
  normalizedQuery: string,
  useSearchTerm: boolean,
) {
  if (useSearchTerm) {
    return normalizedQuery;
  }

  return buildTitleOnlySearchQuery(normalizedQuery);
}

export function buildAdvancedSearchQuery(normalizedQuery: string) {
  const prefixMatches = normalizedQuery.matchAll(/(?:^|\s)([a-z]+):/gi);

  for (const match of prefixMatches) {
    const prefix = match[1]?.toLowerCase();
    if (prefix && !ADVANCED_SEARCH_PREFIXES.has(prefix)) {
      throw new GoogleBooksQueryValidationError(
        `Unsupported advanced keyword "${prefix}:". Use one of: intitle, inauthor, inpublisher, subject, isbn.`,
      );
    }
  }

  return normalizedQuery;
}

export function buildSearchQuery(
  query: string,
  mode: BookSearchMode,
  useSearchTerm: boolean,
) {
  if (mode === "advanced") {
    return buildAdvancedSearchQuery(query);
  }

  return buildBasicSearchQuery(query, useSearchTerm);
}

export function clampPageSize(pageSize: number | undefined) {
  if (!Number.isFinite(pageSize)) {
    return DEFAULT_SEARCH_PAGE_SIZE;
  }

  return Math.min(
    GOOGLE_BOOKS_MAX_RESULTS,
    Math.max(1, Math.floor(pageSize ?? DEFAULT_SEARCH_PAGE_SIZE)),
  );
}

export function clampPage(page: number | undefined) {
  const normalizedPage = Number.isFinite(page) ? Math.floor(page ?? 1) : 1;

  return Math.max(1, normalizedPage);
}

export function parseSearchMode(mode: BookSearchMode | undefined): BookSearchMode {
  return mode === "advanced" ? "advanced" : "basic";
}

import type {
  BookSearchItem,
  BookSearchMode,
  BookSearchPage,
  NormalizedBook,
} from "@/lib/books/types";
import {
  TEST_BOOK_CATALOG,
} from "@/lib/test/constants";
import {
  buildSearchQuery,
  clampPage,
  clampPageSize,
  normalizeBasicQuery,
  parseSearchMode,
} from "@/lib/books/search-query";

type SearchToken = {
  prefix: "intitle" | "inauthor" | "inpublisher" | "subject" | "isbn" | null;
  value: string;
  exclude: boolean;
};

function toSearchItem(book: NormalizedBook): BookSearchItem {
  return {
    googleVolumeId: book.googleVolumeId,
    title: book.title,
    subtitle: book.subtitle,
    authors: book.authors,
    publisher: book.publisher,
    publishedDate: book.publishedDate,
    thumbnailUrl: book.thumbnailUrl,
    infoLink: book.infoLink,
    previewLink: book.previewLink,
  };
}

function normalizeSearchableText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function getCatalog() {
  return TEST_BOOK_CATALOG.map((book) => ({
    ...book,
    authors: [...book.authors],
    categories: [...book.categories],
    rawGoogleJson: structuredClone(book.rawGoogleJson),
  }));
}

function tokenizeQuery(query: string) {
  const matches: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const character of query) {
    if (character === '"') {
      inQuotes = !inQuotes;
      current += character;
      continue;
    }

    if (!inQuotes && /\s/.test(character)) {
      if (current) {
        matches.push(current);
        current = "";
      }
      continue;
    }

    current += character;
  }

  if (current) {
    matches.push(current);
  }

  return matches.map((rawToken): SearchToken => {
    const exclude = rawToken.startsWith("-");
    const tokenWithoutModifier =
      rawToken.startsWith("+") || rawToken.startsWith("-")
        ? rawToken.slice(1)
        : rawToken;
    const prefixMatch = tokenWithoutModifier.match(
      /^(intitle|inauthor|inpublisher|subject|isbn):(.*)$/i,
    );
    const rawValue = prefixMatch ? prefixMatch[2] ?? "" : tokenWithoutModifier;
    const value = rawValue.replace(/^"(.*)"$/, "$1").trim().toLowerCase();

    return {
      prefix: prefixMatch
        ? (prefixMatch[1]?.toLowerCase() as SearchToken["prefix"])
        : null,
      value,
      exclude,
    };
  });
}

function matchesPrefixedToken(book: NormalizedBook, token: SearchToken) {
  switch (token.prefix) {
    case "intitle":
      return normalizeSearchableText(book.title).includes(token.value);
    case "inauthor":
      return book.authors.some((author) =>
        normalizeSearchableText(author).includes(token.value),
      );
    case "inpublisher":
      return normalizeSearchableText(book.publisher).includes(token.value);
    case "subject":
      return book.categories.some((category) =>
        normalizeSearchableText(category).includes(token.value),
      );
    case "isbn":
      return (
        normalizeSearchableText(book.isbn10) === token.value ||
        normalizeSearchableText(book.isbn13) === token.value
      );
    case null:
      return false;
  }
}

function matchesFreeToken(book: NormalizedBook, token: SearchToken) {
  const searchableText = [
    book.title,
    book.subtitle,
    book.publisher,
    book.publishedDate,
    book.description,
    book.language,
    book.isbn10,
    book.isbn13,
    ...book.authors,
    ...book.categories,
  ]
    .filter(Boolean)
    .map((value) => normalizeSearchableText(value))
    .join(" ");

  return searchableText.includes(token.value);
}

function matchesToken(book: NormalizedBook, token: SearchToken) {
  if (!token.value) {
    return true;
  }

  const matched =
    token.prefix === null
      ? matchesFreeToken(book, token)
      : matchesPrefixedToken(book, token);

  return token.exclude ? !matched : matched;
}

function searchCatalog(normalizedQuery: string) {
  const tokens = tokenizeQuery(normalizedQuery);
  if (tokens.length === 0) {
    return [];
  }

  return getCatalog().filter((book) =>
    tokens.every((token) => matchesToken(book, token)),
  );
}

async function searchBooks(
  query: string,
  options?: {
    page?: number;
    pageSize?: number;
    mode?: BookSearchMode;
    useSearchTerm?: boolean;
  },
): Promise<BookSearchPage> {
  const mode = parseSearchMode(options?.mode);
  const useSearchTerm = options?.useSearchTerm === true;
  const normalizedQuery =
    mode === "advanced"
      ? query.trim().replace(/\s+/g, " ")
      : normalizeBasicQuery(query);
  const normalizedSearchQuery = buildSearchQuery(
    normalizedQuery,
    mode,
    useSearchTerm,
  );
  const pageSize = clampPageSize(options?.pageSize);
  const page = clampPage(options?.page);

  if (
    (mode === "basic" && normalizedQuery.length < 2) ||
    (mode === "advanced" && normalizedQuery.length === 0)
  ) {
    return {
      items: [],
      mode,
      page: 1,
      pageSize,
      totalItems: 0,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    };
  }

  const matches = searchCatalog(normalizedSearchQuery);
  const startIndex = (page - 1) * pageSize;
  const pagedItems = matches
    .slice(startIndex, startIndex + pageSize)
    .map(toSearchItem);
  const totalItems = matches.length;
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 0;

  return {
    items: pagedItems,
    mode,
    page,
    pageSize,
    totalItems,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  };
}

async function fetchVolume(
  googleVolumeId: string,
): Promise<NormalizedBook | null> {
  const normalizedVolumeId = googleVolumeId.trim();
  if (!normalizedVolumeId) {
    return null;
  }

  return (
    getCatalog().find((book) => book.googleVolumeId === normalizedVolumeId) ??
    null
  );
}

export const fixtureBookProvider = {
  searchBooks,
  fetchVolume,
};

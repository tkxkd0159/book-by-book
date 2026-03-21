import type { NormalizedBook } from "@/lib/books/types";
import { TEST_BOOK_CATALOG } from "@/tests/support/books/google-books-fixtures";

type SearchToken = {
  exclude: boolean;
  prefix: "intitle" | "inauthor" | "inpublisher" | "subject" | "isbn" | null;
  value: string;
};

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
      exclude,
      prefix: prefixMatch
        ? (prefixMatch[1]?.toLowerCase() as SearchToken["prefix"])
        : null,
      value,
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

export function searchFixtureBookCatalog(normalizedQuery: string) {
  const tokens = tokenizeQuery(normalizedQuery);
  if (tokens.length === 0) {
    return [];
  }

  return getCatalog().filter((book) =>
    tokens.every((token) => matchesToken(book, token)),
  );
}

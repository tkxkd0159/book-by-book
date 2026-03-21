import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createSignedBookImportToken,
  readSignedBookImportToken,
} from "@/lib/books/import-token";
import type { BookDetail } from "@/lib/books/types";

function createBookDetail(overrides: Partial<BookDetail> = {}): BookDetail {
  return {
    googleVolumeId: "volume-1",
    title: "Example Book",
    subtitle: null,
    authors: ["Example Author"],
    publisher: "Example Publisher",
    publishedDate: "2025",
    description: "<p>Example</p>",
    isbn10: null,
    isbn13: "9780000000000",
    pageCount: 320,
    categories: ["Fiction"],
    language: "en",
    thumbnailUrl: "https://books.google.com/thumbnail",
    previewLink: "https://books.google.com/preview",
    infoLink: "https://books.google.com/info",
    canonicalLink: "https://books.google.com/canonical",
    persisted: false,
    ...overrides,
  };
}

describe("book import token", () => {
  const originalAuthSecret = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = "test-auth-secret";
  });

  afterEach(() => {
    if (originalAuthSecret) {
      process.env.AUTH_SECRET = originalAuthSecret;
      return;
    }

    delete process.env.AUTH_SECRET;
  });

  it("round-trips a signed detail payload into a normalized book", () => {
    const token = createSignedBookImportToken(createBookDetail());
    const decodedBook = readSignedBookImportToken(token, "volume-1");

    expect(decodedBook).toMatchObject({
      googleVolumeId: "volume-1",
      title: "Example Book",
      description: "<p>Example</p>",
    });
    expect(decodedBook?.rawGoogleJson).toBeNull();
  });

  it("rejects tampered tokens", () => {
    const token = createSignedBookImportToken(createBookDetail());
    const tamperedToken = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;

    expect(readSignedBookImportToken(tamperedToken, "volume-1")).toBeNull();
  });

  it("rejects tokens for a different volume id", () => {
    const token = createSignedBookImportToken(createBookDetail());

    expect(readSignedBookImportToken(token, "different-volume")).toBeNull();
  });
});

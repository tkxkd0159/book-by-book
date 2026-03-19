import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fixtureBookProvider } from "@/lib/books/fixture-provider";
import { E2E_SEARCH_RESULT_FIXTURE } from "@/lib/test/constants";

describe("fixtureBookProvider", () => {
  it("returns deterministic advanced ISBN search results", async () => {
    const result = await fixtureBookProvider.searchBooks(
      `isbn:${E2E_SEARCH_RESULT_FIXTURE.isbn13}`,
      {
        mode: "advanced",
      },
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.googleVolumeId).toBe(
      E2E_SEARCH_RESULT_FIXTURE.googleVolumeId,
    );
    expect(result.items[0]?.title).toBe(E2E_SEARCH_RESULT_FIXTURE.title);
  });

  it("returns matching detail fixtures by volume id", async () => {
    const volume = await fixtureBookProvider.fetchVolume(
      E2E_SEARCH_RESULT_FIXTURE.googleVolumeId,
    );

    expect(volume?.googleVolumeId).toBe(E2E_SEARCH_RESULT_FIXTURE.googleVolumeId);
    expect(volume?.isbn13).toBe(E2E_SEARCH_RESULT_FIXTURE.isbn13);
    expect(volume?.title).toBe(E2E_SEARCH_RESULT_FIXTURE.title);
  });
});

describe("book data provider selection", () => {
  const originalBooksProvider = process.env.BOOKS_PROVIDER;

  beforeEach(() => {
    vi.resetModules();
    process.env.BOOKS_PROVIDER = "fixture";
    delete process.env.GOOGLE_BOOKS_API_KEY;
  });

  afterEach(() => {
    if (originalBooksProvider) {
      process.env.BOOKS_PROVIDER = originalBooksProvider;
      return;
    }

    delete process.env.BOOKS_PROVIDER;
  });

  it("dispatches search and detail requests through the fixture provider", async () => {
    const { fetchGoogleVolume, searchGoogleBooks } = await import(
      "@/lib/books/google"
    );

    const searchResult = await searchGoogleBooks(
      `isbn:${E2E_SEARCH_RESULT_FIXTURE.isbn13}`,
      {
        mode: "advanced",
      },
    );
    const volume = await fetchGoogleVolume(
      E2E_SEARCH_RESULT_FIXTURE.googleVolumeId,
    );

    expect(searchResult.items[0]?.title).toBe(E2E_SEARCH_RESULT_FIXTURE.title);
    expect(volume?.title).toBe(E2E_SEARCH_RESULT_FIXTURE.title);
  });
});

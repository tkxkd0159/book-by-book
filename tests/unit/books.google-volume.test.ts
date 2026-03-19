import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchGoogleVolume } from "@/lib/books/google";

const fetchMock = vi.fn();
const originalGoogleBooksApiKey = process.env.GOOGLE_BOOKS_API_KEY;
const originalBooksProvider = process.env.BOOKS_PROVIDER;

describe("fetchGoogleVolume", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    delete process.env.BOOKS_PROVIDER;
    process.env.GOOGLE_BOOKS_API_KEY = "test-api-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();

    if (originalGoogleBooksApiKey) {
      process.env.GOOGLE_BOOKS_API_KEY = originalGoogleBooksApiKey;
    } else {
      delete process.env.GOOGLE_BOOKS_API_KEY;
    }

    if (originalBooksProvider) {
      process.env.BOOKS_PROVIDER = originalBooksProvider;
      return;
    }

    delete process.env.BOOKS_PROVIDER;
  });

  it("surfaces a friendly timeout error when Google Books stalls", async () => {
    fetchMock.mockRejectedValue(new DOMException("Timed out", "TimeoutError"));

    await expect(fetchGoogleVolume("volume-1")).rejects.toThrow(
      "Google Books is taking too long to respond. Please try again.",
    );
  });
});

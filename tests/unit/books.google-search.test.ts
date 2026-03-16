import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { searchGoogleBooks } from "@/lib/books/google";

const fetchMock = vi.fn();
const originalGoogleBooksApiKey = process.env.GOOGLE_BOOKS_API_KEY;

describe("searchGoogleBooks quick search", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ totalItems: 0, items: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    process.env.GOOGLE_BOOKS_API_KEY = "test-api-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();

    if (originalGoogleBooksApiKey) {
      process.env.GOOGLE_BOOKS_API_KEY = originalGoogleBooksApiKey;
      return;
    }

    delete process.env.GOOGLE_BOOKS_API_KEY;
  });

  it("wraps default quick searches in an intitle query", async () => {
    await searchGoogleBooks("  Harry   Potter  ", { mode: "basic" });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url] = fetchMock.mock.calls[0] ?? [];
    const requestUrl = new URL(String(url));

    expect(requestUrl.searchParams.get("q")).toBe('intitle:"Harry Potter"');
  });

  it("preserves the normalized raw query when search term mode is enabled", async () => {
    await searchGoogleBooks('  "Elizabeth Bennet"   +Darcy   -Austen  ', {
      mode: "basic",
      useSearchTerm: true,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url] = fetchMock.mock.calls[0] ?? [];
    const requestUrl = new URL(String(url));

    expect(requestUrl.searchParams.get("q")).toBe(
      '"Elizabeth Bennet" +Darcy -Austen',
    );
  });
});

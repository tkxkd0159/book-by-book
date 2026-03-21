import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GoogleBooksHttpClient } from "@/lib/books/google-http-client";

const fetchMock = vi.fn();

describe("GoogleBooksHttpClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("surfaces a friendly timeout error when Google Books stalls", async () => {
    fetchMock.mockRejectedValue(new DOMException("Timed out", "TimeoutError"));
    const client = new GoogleBooksHttpClient({
      apiKey: "test-api-key",
      fetchImpl: fetchMock,
    });

    await expect(client.fetchVolume("volume-1")).rejects.toThrow(
      "Google Books is taking too long to respond. Please try again.",
    );
  });

  it("uses an overridden Google Books API base URL when provided", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ items: [], totalItems: 0 }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    const client = new GoogleBooksHttpClient({
      apiBaseUrl: "http://127.0.0.1:4101/books/v1/volumes",
      apiKey: "test-api-key",
      fetchImpl: fetchMock,
    });

    await client.searchVolumes({
      maxResults: 10,
      query: "dune",
      startIndex: 0,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:4101/books/v1/volumes?maxResults=10&printType=books&projection=lite&q=dune&startIndex=0&key=test-api-key",
      expect.any(Object),
    );
  });
});

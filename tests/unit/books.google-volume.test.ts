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
});

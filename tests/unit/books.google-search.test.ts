import { describe, expect, it } from "vitest";

import type { GoogleVolume } from "@/lib/books/google-api";
import type {
  GoogleBooksClient,
  GoogleBooksSearchRequest,
} from "@/lib/books/google-http-client";
import { GoogleBooksService } from "@/lib/books/google-service";
import { E2E_SEARCH_RESULT_VOLUME } from "@/lib/test-harness/google-books-fixtures";

class RecordingGoogleBooksClient implements GoogleBooksClient {
  volumeToReturn: GoogleVolume | null = null;
  readonly fetchRequests: string[] = [];
  readonly searchRequests: GoogleBooksSearchRequest[] = [];

  async fetchVolume(googleVolumeId: string) {
    this.fetchRequests.push(googleVolumeId);
    return this.volumeToReturn;
  }

  async searchVolumes(request: GoogleBooksSearchRequest) {
    this.searchRequests.push(request);
    return { items: [], totalItems: 0 };
  }
}

describe("GoogleBooksService", () => {
  it("wraps default quick searches in an intitle query", async () => {
    const client = new RecordingGoogleBooksClient();
    const service = new GoogleBooksService(client);

    await service.searchBooks("  Harry   Potter  ", { mode: "basic" });

    expect(client.searchRequests).toHaveLength(1);
    expect(client.searchRequests[0]?.query).toBe('intitle:"Harry Potter"');
  });

  it("preserves the normalized raw query when search term mode is enabled", async () => {
    const client = new RecordingGoogleBooksClient();
    const service = new GoogleBooksService(client);

    await service.searchBooks('  "Elizabeth Bennet"   +Darcy   -Austen  ', {
      mode: "basic",
      useSearchTerm: true,
    });

    expect(client.searchRequests).toHaveLength(1);
    expect(client.searchRequests[0]?.query).toBe(
      '"Elizabeth Bennet" +Darcy -Austen',
    );
  });

  it("normalizes fetched volumes through the client seam", async () => {
    const client = new RecordingGoogleBooksClient();
    const service = new GoogleBooksService(client);
    client.volumeToReturn = E2E_SEARCH_RESULT_VOLUME;

    const volume = await service.fetchVolume("fixture-search-matilda");

    expect(client.fetchRequests).toEqual(["fixture-search-matilda"]);
    expect(volume).toMatchObject({
      googleVolumeId: "fixture-search-matilda",
      isbn13: "9780140328721",
      title: "Matilda",
    });
  });
});

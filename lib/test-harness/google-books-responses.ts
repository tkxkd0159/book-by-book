import type { GoogleVolume, GoogleVolumesResponse } from "@/lib/books/google-api";
import {
  TEST_BOOK_VOLUME_FIXTURES_BY_ID,
} from "@/lib/test-harness/google-books-fixtures";
import { searchFixtureBookCatalog } from "@/lib/test-harness/google-books-search";

export const GOOGLE_BOOKS_VOLUMES_PATH = "/books/v1/volumes";

function cloneVolume(volume: GoogleVolume) {
  return structuredClone(volume);
}

function cloneRawGoogleJson(rawGoogleJson: unknown) {
  return structuredClone(rawGoogleJson) as GoogleVolume;
}

function readPositiveInteger(
  value: string | null,
  fallbackValue: number,
): number {
  const parsedValue = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return fallbackValue;
  }

  return parsedValue;
}

export function findFixtureGoogleVolume(
  googleVolumeId: string,
): GoogleVolume | null {
  const normalizedVolumeId = googleVolumeId.trim();
  if (!normalizedVolumeId) {
    return null;
  }

  const volume = TEST_BOOK_VOLUME_FIXTURES_BY_ID.get(normalizedVolumeId);
  return volume ? cloneVolume(volume) : null;
}

export function createGoogleBooksSearchResponse(
  params: URLSearchParams,
): GoogleVolumesResponse {
  const query = params.get("q")?.trim() ?? "";
  const maxResults = readPositiveInteger(params.get("maxResults"), 18);
  const startIndex = readPositiveInteger(params.get("startIndex"), 0);
  const matches = query ? searchFixtureBookCatalog(query) : [];
  const pageItems = matches.slice(startIndex, startIndex + maxResults);

  return {
    items: pageItems.map((item) => cloneRawGoogleJson(item.rawGoogleJson)),
    totalItems: matches.length,
  };
}

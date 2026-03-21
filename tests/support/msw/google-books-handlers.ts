import { HttpResponse, http } from "msw";

import { searchFixtureBookCatalog } from "@/tests/support/books/catalog-search";
import { TEST_BOOK_VOLUME_FIXTURES_BY_ID } from "@/tests/support/books/google-books-fixtures";

const GOOGLE_BOOKS_VOLUMES_URL = "https://www.googleapis.com/books/v1/volumes";

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

export const googleBooksHandlers = [
  http.get(GOOGLE_BOOKS_VOLUMES_URL, ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim() ?? "";
    const maxResults = readPositiveInteger(url.searchParams.get("maxResults"), 18);
    const startIndex = readPositiveInteger(url.searchParams.get("startIndex"), 0);
    const matches = query ? searchFixtureBookCatalog(query) : [];
    const pageItems = matches.slice(startIndex, startIndex + maxResults);

    return HttpResponse.json({
      items: pageItems.map((item) => structuredClone(item.rawGoogleJson)),
      totalItems: matches.length,
    });
  }),
  http.get(`${GOOGLE_BOOKS_VOLUMES_URL}/:volumeId`, ({ params }) => {
    const volumeId =
      typeof params.volumeId === "string" ? params.volumeId.trim() : "";

    if (!volumeId) {
      return new HttpResponse(null, { status: 404 });
    }

    const volume = TEST_BOOK_VOLUME_FIXTURES_BY_ID.get(volumeId);
    if (!volume) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json(structuredClone(volume));
  }),
] as const;

import { HttpResponse, http } from "msw";

import {
  GOOGLE_BOOKS_VOLUMES_PATH,
  createGoogleBooksSearchResponse,
  findFixtureGoogleVolume,
} from "@/lib/test-harness/google-books-responses";

const GOOGLE_BOOKS_VOLUMES_URL = `https://www.googleapis.com${GOOGLE_BOOKS_VOLUMES_PATH}`;

export const googleBooksHandlers = [
  http.get(GOOGLE_BOOKS_VOLUMES_URL, ({ request }) => {
    const url = new URL(request.url);

    return HttpResponse.json(createGoogleBooksSearchResponse(url.searchParams));
  }),
  http.get(`${GOOGLE_BOOKS_VOLUMES_URL}/:volumeId`, ({ params }) => {
    const volumeId =
      typeof params.volumeId === "string" ? params.volumeId.trim() : "";
    const volume = findFixtureGoogleVolume(volumeId);

    if (!volume) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json(volume);
  }),
] as const;

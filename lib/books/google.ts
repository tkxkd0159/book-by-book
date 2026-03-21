import type {
  BookSearchMode,
  BookSearchPage,
  NormalizedBook,
} from "@/lib/books/types";
import { GoogleBooksHttpClient } from "@/lib/books/google-http-client";
import { GoogleBooksService } from "@/lib/books/google-service";

export {
  GoogleBooksQueryValidationError,
  GoogleBooksRequestError,
} from "@/lib/books/errors";

function getGoogleBooksService() {
  return new GoogleBooksService(new GoogleBooksHttpClient());
}

export async function searchGoogleBooks(
  query: string,
  options?: {
    page?: number;
    pageSize?: number;
    mode?: BookSearchMode;
    useSearchTerm?: boolean;
  },
): Promise<BookSearchPage> {
  return getGoogleBooksService().searchBooks(query, options);
}

export async function fetchGoogleVolume(
  googleVolumeId: string,
): Promise<NormalizedBook | null> {
  return getGoogleBooksService().fetchVolume(googleVolumeId);
}

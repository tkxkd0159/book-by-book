import type {
  BookSearchMode,
  BookSearchPage,
  NormalizedBook,
} from "@/lib/books/types";
import { getBookDataProvider } from "@/lib/books/provider";

export {
  GoogleBooksQueryValidationError,
  GoogleBooksRequestError,
} from "@/lib/books/errors";

export async function searchGoogleBooks(
  query: string,
  options?: {
    page?: number;
    pageSize?: number;
    mode?: BookSearchMode;
    useSearchTerm?: boolean;
  },
): Promise<BookSearchPage> {
  return getBookDataProvider().searchBooks(query, options);
}

export async function fetchGoogleVolume(
  googleVolumeId: string,
): Promise<NormalizedBook | null> {
  return getBookDataProvider().fetchVolume(googleVolumeId);
}

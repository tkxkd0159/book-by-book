import { getBooksProvider } from "@/lib/env";
import { fixtureBookProvider } from "@/lib/books/fixture-provider";
import { googleBookProvider } from "@/lib/books/google-provider";
import type {
  BookSearchMode,
  BookSearchPage,
  NormalizedBook,
} from "@/lib/books/types";

export type BookDataProvider = {
  searchBooks(
    query: string,
    options?: {
      page?: number;
      pageSize?: number;
      mode?: BookSearchMode;
      useSearchTerm?: boolean;
    },
  ): Promise<BookSearchPage>;
  fetchVolume(googleVolumeId: string): Promise<NormalizedBook | null>;
};

export function getBookDataProvider(): BookDataProvider {
  switch (getBooksProvider()) {
    case "fixture":
      return fixtureBookProvider;
    case "google":
      return googleBookProvider;
  }
}

import {
  buildSearchQuery,
  clampPage,
  clampPageSize,
  normalizeBasicQuery,
  parseSearchMode,
} from "@/lib/books/search-query";
import type {
  BookSearchItem,
  BookSearchMode,
  BookSearchPage,
  NormalizedBook,
} from "@/lib/books/types";
import { normalizeSearchResult, normalizeVolume } from "@/lib/books/google-normalization";
import type { GoogleBooksClient } from "@/lib/books/google-http-client";

const GOOGLE_TOTAL_ITEMS_UNRELIABLE_THRESHOLD = 1_000_000;

export class GoogleBooksService {
  readonly #client: GoogleBooksClient;

  constructor(client: GoogleBooksClient) {
    this.#client = client;
  }

  async fetchVolume(googleVolumeId: string): Promise<NormalizedBook | null> {
    const normalizedVolumeId = googleVolumeId.trim();
    if (!normalizedVolumeId) {
      return null;
    }

    const payload = await this.#client.fetchVolume(normalizedVolumeId);
    if (!payload) {
      return null;
    }

    return normalizeVolume(payload);
  }

  async searchBooks(
    query: string,
    options?: {
      mode?: BookSearchMode;
      page?: number;
      pageSize?: number;
      useSearchTerm?: boolean;
    },
  ): Promise<BookSearchPage> {
    const mode = parseSearchMode(options?.mode);
    const useSearchTerm = options?.useSearchTerm === true;
    const normalizedQuery =
      mode === "advanced"
        ? query.trim().replace(/\s+/g, " ")
        : normalizeBasicQuery(query);
    const normalizedGoogleQuery = buildSearchQuery(
      normalizedQuery,
      mode,
      useSearchTerm,
    );
    const pageSize = clampPageSize(options?.pageSize);
    const page = clampPage(options?.page);

    if (
      (mode === "basic" && normalizedQuery.length < 2) ||
      (mode === "advanced" && normalizedQuery.length === 0)
    ) {
      return {
        hasNextPage: false,
        hasPreviousPage: false,
        items: [],
        mode,
        page: 1,
        pageSize,
        totalItems: 0,
        totalPages: 0,
      };
    }

    const startIndex = (page - 1) * pageSize;
    const payload = await this.#client.searchVolumes({
      maxResults: pageSize,
      query: normalizedGoogleQuery,
      startIndex,
    });
    const items =
      payload.items
        ?.map(normalizeSearchResult)
        .filter((item): item is BookSearchItem => item !== null) ?? [];
    const reportedTotalItems = Math.max(0, payload.totalItems ?? 0);
    const hasReliableTotalItems =
      reportedTotalItems > 0 &&
      reportedTotalItems < GOOGLE_TOTAL_ITEMS_UNRELIABLE_THRESHOLD;
    const totalItems = hasReliableTotalItems ? reportedTotalItems : null;
    const totalPages =
      totalItems !== null && totalItems > 0
        ? Math.ceil(totalItems / pageSize)
        : null;

    return {
      hasNextPage:
        totalPages !== null ? page < totalPages : items.length === pageSize,
      hasPreviousPage: page > 1,
      items,
      mode,
      page,
      pageSize,
      totalItems,
      totalPages,
    };
  }
}

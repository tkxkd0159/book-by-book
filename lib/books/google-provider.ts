import type {
  BookSearchItem,
  BookSearchMode,
  BookSearchPage,
  NormalizedBook,
} from "@/lib/books/types";
import { formatBookDescription } from "@/lib/books/description";
import { getGoogleBooksEnv } from "@/lib/env";
import {
  GoogleBooksRequestError,
} from "@/lib/books/errors";
import {
  buildSearchQuery,
  clampPage,
  clampPageSize,
  normalizeBasicQuery,
  parseSearchMode,
} from "@/lib/books/search-query";

const GOOGLE_BOOKS_BASE_URL = "https://www.googleapis.com/books/v1/volumes";
const GOOGLE_BOOKS_DATA_REVALIDATE_SECONDS = 300;
const GOOGLE_BOOKS_REQUEST_TIMEOUT_MS = 4_000;
const GOOGLE_TOTAL_ITEMS_UNRELIABLE_THRESHOLD = 1_000_000;

type GoogleVolume = {
  id: string;
  selfLink?: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    industryIdentifiers?: Array<{ type?: string; identifier?: string }>;
    pageCount?: number;
    categories?: string[];
    language?: string;
    previewLink?: string;
    infoLink?: string;
    canonicalVolumeLink?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
};

type GoogleVolumesResponse = {
  totalItems?: number;
  items?: GoogleVolume[];
};

function buildGoogleBooksUrl(path: string, params: URLSearchParams) {
  const apiKey = getGoogleBooksEnv().apiKey;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_BOOKS_API_KEY is required for Google Books requests.",
    );
  }
  params.set("key", apiKey);

  return `${GOOGLE_BOOKS_BASE_URL}${path}?${params.toString()}`;
}

async function fetchGoogleBooksJson<TPayload>({
  path,
  params,
  cache,
  revalidate,
}: {
  path: string;
  params: URLSearchParams;
  cache: RequestCache;
  revalidate?: number;
}): Promise<TPayload | null> {
  let response: Response;

  try {
    response = await fetch(buildGoogleBooksUrl(path, params), {
      cache,
      next: revalidate ? { revalidate } : undefined,
      signal: AbortSignal.timeout(GOOGLE_BOOKS_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError")
    ) {
      throw new GoogleBooksRequestError(
        "Google Books is taking too long to respond. Please try again.",
        { cause: error },
      );
    }

    throw new GoogleBooksRequestError(
      "Google Books is temporarily unavailable. Please try again.",
      { cause: error instanceof Error ? error : undefined },
    );
  }

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new GoogleBooksRequestError(
      `Google Books request failed with status ${response.status}`,
    );
  }

  return (await response.json()) as TPayload;
}

function normalizeLink(link: string | undefined): string | null {
  if (!link) {
    return null;
  }

  return link.replace("http://", "https://");
}

function findIdentifier(
  identifiers: Array<{ type?: string; identifier?: string }> | undefined,
  targetType: "ISBN_10" | "ISBN_13",
) {
  return (
    identifiers?.find((item) => item.type === targetType)?.identifier?.trim() ??
    null
  );
}

function normalizeVolume(volume: GoogleVolume): NormalizedBook | null {
  const volumeInfo = volume.volumeInfo;
  if (!volumeInfo?.title) {
    return null;
  }

  return {
    googleVolumeId: volume.id,
    title: volumeInfo.title,
    subtitle: volumeInfo.subtitle ?? null,
    authors: volumeInfo.authors ?? [],
    publisher: volumeInfo.publisher ?? null,
    publishedDate: volumeInfo.publishedDate ?? null,
    description: formatBookDescription(volumeInfo.description ?? null),
    isbn10: findIdentifier(volumeInfo.industryIdentifiers, "ISBN_10"),
    isbn13: findIdentifier(volumeInfo.industryIdentifiers, "ISBN_13"),
    pageCount: volumeInfo.pageCount ?? null,
    categories: volumeInfo.categories ?? [],
    language: volumeInfo.language ?? null,
    thumbnailUrl: normalizeLink(
      volumeInfo.imageLinks?.thumbnail ?? volumeInfo.imageLinks?.smallThumbnail,
    ),
    previewLink: normalizeLink(volumeInfo.previewLink),
    infoLink: normalizeLink(volumeInfo.infoLink),
    canonicalLink: normalizeLink(
      volumeInfo.canonicalVolumeLink ?? volume.selfLink,
    ),
    rawGoogleJson: volume,
  };
}

function normalizeSearchResult(volume: GoogleVolume): BookSearchItem | null {
  const normalized = normalizeVolume(volume);
  if (!normalized) {
    return null;
  }

  return {
    googleVolumeId: normalized.googleVolumeId,
    title: normalized.title,
    subtitle: normalized.subtitle,
    authors: normalized.authors,
    publisher: normalized.publisher,
    publishedDate: normalized.publishedDate,
    thumbnailUrl: normalized.thumbnailUrl,
    infoLink: normalized.infoLink,
    previewLink: normalized.previewLink,
  };
}

async function searchBooks(
  query: string,
  options?: {
    page?: number;
    pageSize?: number;
    mode?: BookSearchMode;
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
      items: [],
      mode,
      page: 1,
      pageSize,
      totalItems: 0,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    };
  }

  const startIndex = (page - 1) * pageSize;
  const params = new URLSearchParams({
    q: normalizedGoogleQuery,
    startIndex: String(startIndex),
    maxResults: String(pageSize),
    printType: "books",
    projection: "lite",
  });

  const payload =
    (await fetchGoogleBooksJson<GoogleVolumesResponse>({
      path: "",
      params,
      cache: "force-cache",
      revalidate: GOOGLE_BOOKS_DATA_REVALIDATE_SECONDS,
    })) ?? {};
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
    items,
    mode,
    page,
    pageSize,
    totalItems,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage:
      totalPages !== null ? page < totalPages : items.length === pageSize,
  };
}

async function fetchVolume(
  googleVolumeId: string,
): Promise<NormalizedBook | null> {
  const normalizedVolumeId = googleVolumeId.trim();
  if (!normalizedVolumeId) {
    return null;
  }

  const payload = await fetchGoogleBooksJson<GoogleVolume>({
    path: `/${encodeURIComponent(normalizedVolumeId)}`,
    params: new URLSearchParams(),
    cache: "force-cache",
    revalidate: GOOGLE_BOOKS_DATA_REVALIDATE_SECONDS,
  });
  if (!payload) {
    return null;
  }

  return normalizeVolume(payload);
}

export const googleBookProvider = {
  searchBooks,
  fetchVolume,
};

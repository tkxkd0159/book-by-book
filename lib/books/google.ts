import type {
  BookSearchItem,
  BookSearchMode,
  BookSearchPage,
  NormalizedBook,
} from "@/lib/books/types";
import { formatBookDescription } from "@/lib/books/description";

const GOOGLE_BOOKS_BASE_URL = "https://www.googleapis.com/books/v1/volumes";
const SEARCH_CACHE_TTL_MS = 3 * 60 * 1000;
const SEARCH_CACHE_MAX_ENTRIES = 250;
const SEARCH_CACHE_PRUNE_TARGET = 200;
const SEARCH_CACHE_CLEANUP_INTERVAL_MS = 30 * 1000;
const DEFAULT_SEARCH_PAGE_SIZE = 18;
const GOOGLE_BOOKS_MAX_RESULTS = 40;
const GOOGLE_TOTAL_ITEMS_UNRELIABLE_THRESHOLD = 1_000_000;
const ADVANCED_SEARCH_PREFIXES = new Set([
  "intitle",
  "inauthor",
  "inpublisher",
  "subject",
  "isbn",
]);

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

type SearchCacheEntry = {
  expiresAt: number;
  value: BookSearchPage;
};

const searchCache = new Map<string, SearchCacheEntry>();
let lastSearchCacheCleanupAt = 0;

class GoogleBooksQueryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleBooksQueryValidationError";
  }
}

function buildGoogleBooksUrl(path: string, params: URLSearchParams) {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
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
  const response = await fetch(buildGoogleBooksUrl(path, params), {
    cache,
    next: revalidate ? { revalidate } : undefined,
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
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

function normalizeBasicQuery(query: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return "";
  }

  let normalized = "";
  let inQuotes = false;
  let previousWasWhitespace = false;

  for (const character of trimmed) {
    if (character === '"') {
      inQuotes = !inQuotes;
      normalized += character;
      previousWasWhitespace = false;
      continue;
    }

    if (!inQuotes && /\s/.test(character)) {
      if (!previousWasWhitespace) {
        normalized += " ";
        previousWasWhitespace = true;
      }
      continue;
    }

    normalized += character;
    previousWasWhitespace = false;
  }

  return normalized.trim();
}

function buildTitleOnlySearchQuery(normalizedQuery: string) {
  const escaped = normalizedQuery.replace(/"/g, '\\"');
  return `intitle:"${escaped}"`;
}

function buildBasicSearchQuery(normalizedQuery: string, titleOnly: boolean) {
  if (!titleOnly) {
    return normalizedQuery;
  }

  return buildTitleOnlySearchQuery(normalizedQuery);
}

function buildAdvancedSearchQuery(normalizedQuery: string) {
  const prefixMatches = normalizedQuery.matchAll(/(?:^|\s)([a-z]+):/gi);

  for (const match of prefixMatches) {
    const prefix = match[1]?.toLowerCase();
    if (prefix && !ADVANCED_SEARCH_PREFIXES.has(prefix)) {
      throw new GoogleBooksQueryValidationError(
        `Unsupported advanced keyword "${prefix}:". Use one of: intitle, inauthor, inpublisher, subject, isbn.`,
      );
    }
  }

  return normalizedQuery;
}

function buildSearchQuery(
  query: string,
  mode: BookSearchMode,
  titleOnly: boolean,
) {
  if (mode === "advanced") {
    return buildAdvancedSearchQuery(query);
  }

  return buildBasicSearchQuery(query, titleOnly);
}

function clampPageSize(pageSize: number | undefined) {
  if (!Number.isFinite(pageSize)) {
    return DEFAULT_SEARCH_PAGE_SIZE;
  }

  return Math.min(
    GOOGLE_BOOKS_MAX_RESULTS,
    Math.max(1, Math.floor(pageSize ?? DEFAULT_SEARCH_PAGE_SIZE)),
  );
}

function clampPage(page: number | undefined) {
  const normalizedPage = Number.isFinite(page) ? Math.floor(page ?? 1) : 1;

  return Math.max(1, normalizedPage);
}

function parseSearchMode(mode: BookSearchMode | undefined): BookSearchMode {
  return mode === "advanced" ? "advanced" : "basic";
}

function cleanupSearchCache(now: number) {
  if (
    now - lastSearchCacheCleanupAt < SEARCH_CACHE_CLEANUP_INTERVAL_MS &&
    searchCache.size < SEARCH_CACHE_MAX_ENTRIES
  ) {
    return;
  }

  lastSearchCacheCleanupAt = now;

  for (const [cacheKey, entry] of searchCache) {
    if (entry.expiresAt <= now) {
      searchCache.delete(cacheKey);
    }
  }

  if (searchCache.size > SEARCH_CACHE_MAX_ENTRIES) {
    while (searchCache.size > SEARCH_CACHE_PRUNE_TARGET) {
      const oldestKey = searchCache.keys().next().value;
      if (typeof oldestKey !== "string") {
        break;
      }
      searchCache.delete(oldestKey);
    }
  }
}

function readSearchCache(cacheKey: string, now: number) {
  cleanupSearchCache(now);

  const cached = searchCache.get(cacheKey);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= now) {
    searchCache.delete(cacheKey);
    return null;
  }

  // Reinsert to keep frequently used keys hot in the Map iteration order.
  searchCache.delete(cacheKey);
  searchCache.set(cacheKey, cached);

  return cached.value;
}

function writeSearchCache(
  cacheKey: string,
  value: BookSearchPage,
  now: number,
) {
  searchCache.set(cacheKey, {
    value,
    expiresAt: now + SEARCH_CACHE_TTL_MS,
  });
  cleanupSearchCache(now);
}

export async function searchGoogleBooks(
  query: string,
  options?: {
    page?: number;
    pageSize?: number;
    mode?: BookSearchMode;
    titleOnly?: boolean;
  },
): Promise<BookSearchPage> {
  const mode = parseSearchMode(options?.mode);
  const titleOnly = options?.titleOnly === true;
  const normalizedQuery =
    mode === "advanced"
      ? query.trim().replace(/\s+/g, " ")
      : normalizeBasicQuery(query);

  const normalizedGoogleQuery = buildSearchQuery(
    normalizedQuery,
    mode,
    titleOnly,
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

  const cacheKey = `${mode}:${titleOnly ? "title-only:" : ""}${normalizedGoogleQuery.toLowerCase()}::p${page}::s${pageSize}`;
  const cacheNow = Date.now();
  const cachedResult = readSearchCache(cacheKey, cacheNow);
  if (cachedResult) {
    return cachedResult;
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
      revalidate: 300,
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
  const result: BookSearchPage = {
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

  writeSearchCache(cacheKey, result, Date.now());

  return result;
}

export { GoogleBooksQueryValidationError };

export async function fetchGoogleVolume(
  googleVolumeId: string,
): Promise<NormalizedBook | null> {
  const normalizedVolumeId = googleVolumeId.trim();
  if (!normalizedVolumeId) {
    return null;
  }

  const payload = await fetchGoogleBooksJson<GoogleVolume>({
    path: `/${encodeURIComponent(normalizedVolumeId)}`,
    params: new URLSearchParams(),
    cache: "no-store",
  });
  if (!payload) {
    return null;
  }

  return normalizeVolume(payload);
}

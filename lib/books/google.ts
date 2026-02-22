import type { BookSearchItem, NormalizedBook } from "@/lib/books/types";
import { formatBookDescription } from "@/lib/books/description";

const GOOGLE_BOOKS_BASE_URL = "https://www.googleapis.com/books/v1/volumes";
const SEARCH_CACHE_TTL_MS = 3 * 60 * 1000;

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
  items?: GoogleVolume[];
};

type SearchCacheEntry = {
  expiresAt: number;
  value: BookSearchItem[];
};

const searchCache = new Map<string, SearchCacheEntry>();

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

function validateQuery(query: string) {
  return query.trim().replace(/\s+/g, " ");
}

export async function searchGoogleBooks(
  query: string,
): Promise<BookSearchItem[]> {
  const normalizedQuery = validateQuery(query);
  if (normalizedQuery.length < 2) {
    return [];
  }

  const cacheKey = normalizedQuery.toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const params = new URLSearchParams({
    q: normalizedQuery,
    maxResults: "20",
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

  searchCache.set(cacheKey, {
    value: items,
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
  });

  return items;
}

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

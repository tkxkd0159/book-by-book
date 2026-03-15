import { fetchGoogleVolume } from "@/lib/books/google";
import { findBookByGoogleVolumeId } from "@/lib/books/repository";
import type { BookDetail, NormalizedBook } from "@/lib/books/types";
import type { BookRecord } from "@/types/db";

const DETAIL_CACHE_TTL_MS = 5 * 60 * 1000;
const DETAIL_CACHE_NEGATIVE_TTL_MS = 60 * 1000;
const DETAIL_CACHE_MAX_ENTRIES = 500;
const DETAIL_CACHE_PRUNE_TARGET = 400;
const DETAIL_CACHE_CLEANUP_INTERVAL_MS = 30 * 1000;

type VolumeDetailCacheEntry = {
  expiresAt: number;
  value: BookDetail | null;
};

const volumeDetailCache = new Map<string, VolumeDetailCacheEntry>();
let lastVolumeDetailCacheCleanupAt = 0;

function normalizeCacheKey(googleVolumeId: string) {
  return googleVolumeId.trim();
}

function cleanupVolumeDetailCache(now: number) {
  if (
    now - lastVolumeDetailCacheCleanupAt < DETAIL_CACHE_CLEANUP_INTERVAL_MS &&
    volumeDetailCache.size < DETAIL_CACHE_MAX_ENTRIES
  ) {
    return;
  }

  lastVolumeDetailCacheCleanupAt = now;

  for (const [key, entry] of volumeDetailCache) {
    if (entry.expiresAt <= now) {
      volumeDetailCache.delete(key);
    }
  }

  if (volumeDetailCache.size > DETAIL_CACHE_MAX_ENTRIES) {
    while (volumeDetailCache.size > DETAIL_CACHE_PRUNE_TARGET) {
      const oldestKey = volumeDetailCache.keys().next().value;
      if (!oldestKey) {
        break;
      }

      volumeDetailCache.delete(oldestKey);
    }
  }
}

function readVolumeDetailCache(
  googleVolumeId: string,
  now: number,
): { hit: boolean; value: BookDetail | null } {
  cleanupVolumeDetailCache(now);

  const entry = volumeDetailCache.get(googleVolumeId);
  if (!entry) {
    return { hit: false, value: null };
  }

  if (entry.expiresAt <= now) {
    volumeDetailCache.delete(googleVolumeId);
    return { hit: false, value: null };
  }

  volumeDetailCache.delete(googleVolumeId);
  volumeDetailCache.set(googleVolumeId, entry);

  return { hit: true, value: entry.value };
}

function writeVolumeDetailCache(
  googleVolumeId: string,
  value: BookDetail | null,
  ttlMs: number,
) {
  const normalizedKey = normalizeCacheKey(googleVolumeId);
  const now = Date.now();

  cleanupVolumeDetailCache(now);
  volumeDetailCache.delete(normalizedKey);
  volumeDetailCache.set(normalizedKey, {
    expiresAt: now + ttlMs,
    value,
  });
}

function mapNormalizedBookToDetail(
  book: Omit<NormalizedBook, "rawGoogleJson">,
  persisted: boolean,
): BookDetail {
  return {
    googleVolumeId: book.googleVolumeId,
    title: book.title,
    subtitle: book.subtitle,
    authors: book.authors,
    publisher: book.publisher,
    publishedDate: book.publishedDate,
    description: book.description,
    isbn10: book.isbn10,
    isbn13: book.isbn13,
    pageCount: book.pageCount,
    categories: book.categories,
    language: book.language,
    thumbnailUrl: book.thumbnailUrl,
    previewLink: book.previewLink,
    infoLink: book.infoLink,
    canonicalLink: book.canonicalLink,
    persisted,
  };
}

export function mapBookRecordToDetail(book: BookRecord): BookDetail {
  return mapNormalizedBookToDetail(
    {
      googleVolumeId: book.googleVolumeId,
      title: book.title,
      subtitle: book.subtitle,
      authors: book.authors,
      publisher: book.publisher,
      publishedDate: book.publishedDate,
      description: book.description,
      isbn10: book.isbn10,
      isbn13: book.isbn13,
      pageCount: book.pageCount,
      categories: book.categories,
      language: book.language,
      thumbnailUrl: book.thumbnailUrl,
      previewLink: book.previewLink,
      infoLink: book.infoLink,
      canonicalLink: book.canonicalLink,
    },
    true,
  );
}

export function primePersistedBookDetailCache(book: BookRecord) {
  writeVolumeDetailCache(
    book.googleVolumeId,
    mapBookRecordToDetail(book),
    DETAIL_CACHE_TTL_MS,
  );
}

export function clearBookDetailCache() {
  volumeDetailCache.clear();
  lastVolumeDetailCacheCleanupAt = 0;
}

export async function resolveBookDetail(
  googleVolumeId: string,
): Promise<BookDetail | null> {
  const normalizedVolumeId = normalizeCacheKey(googleVolumeId);
  if (!normalizedVolumeId) {
    return null;
  }

  const now = Date.now();
  const cached = readVolumeDetailCache(normalizedVolumeId, now);
  if (cached.hit) {
    return cached.value;
  }

  const persistedBook = await findBookByGoogleVolumeId(normalizedVolumeId);
  if (persistedBook) {
    const detail = mapBookRecordToDetail(persistedBook);
    writeVolumeDetailCache(normalizedVolumeId, detail, DETAIL_CACHE_TTL_MS);
    return detail;
  }

  const googleBook = await fetchGoogleVolume(normalizedVolumeId);
  if (!googleBook) {
    writeVolumeDetailCache(
      normalizedVolumeId,
      null,
      DETAIL_CACHE_NEGATIVE_TTL_MS,
    );
    return null;
  }

  const detail = mapNormalizedBookToDetail(
    {
      googleVolumeId: googleBook.googleVolumeId,
      title: googleBook.title,
      subtitle: googleBook.subtitle,
      authors: googleBook.authors,
      publisher: googleBook.publisher,
      publishedDate: googleBook.publishedDate,
      description: googleBook.description,
      isbn10: googleBook.isbn10,
      isbn13: googleBook.isbn13,
      pageCount: googleBook.pageCount,
      categories: googleBook.categories,
      language: googleBook.language,
      thumbnailUrl: googleBook.thumbnailUrl,
      previewLink: googleBook.previewLink,
      infoLink: googleBook.infoLink,
      canonicalLink: googleBook.canonicalLink,
    },
    false,
  );

  writeVolumeDetailCache(normalizedVolumeId, detail, DETAIL_CACHE_TTL_MS);
  return detail;
}

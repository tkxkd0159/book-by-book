import { fetchGoogleVolume } from "@/lib/books/google";
import { findBookByGoogleVolumeId } from "@/lib/books/repository";
import type { BookDetail, NormalizedBook } from "@/lib/books/types";
import type { BookRecord } from "@/types/db";

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

export async function resolveBookDetail(
  googleVolumeId: string,
): Promise<BookDetail | null> {
  const normalizedVolumeId = googleVolumeId.trim();
  if (!normalizedVolumeId) {
    return null;
  }

  const persistedBook = await findBookByGoogleVolumeId(normalizedVolumeId);
  if (persistedBook) {
    return mapBookRecordToDetail(persistedBook);
  }

  const googleBook = await fetchGoogleVolume(normalizedVolumeId);
  if (!googleBook) {
    return null;
  }

  return mapNormalizedBookToDetail(
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
}

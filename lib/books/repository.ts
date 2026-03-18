import { fetchGoogleVolume } from "@/lib/books/google";
import type { NormalizedBook } from "@/lib/books/types";
import sql from "@/lib/db";
import type { BookRecord } from "@/types/db";

type BookRow = {
  id: string;
  googleVolumeId: string;
  title: string;
  subtitle: string | null;
  authors: string[] | null;
  publisher: string | null;
  publishedDate: string | null;
  description: string | null;
  isbn10: string | null;
  isbn13: string | null;
  pageCount: number | null;
  categories: string[] | null;
  language: string | null;
  thumbnailUrl: string | null;
  previewLink: string | null;
  infoLink: string | null;
  canonicalLink: string | null;
  rawGoogleJson: unknown;
  createdAt: Date;
  updatedAt: Date;
};

function mapBookRow(row: BookRow): BookRecord {
  return {
    ...row,
    authors: row.authors ?? [],
    categories: row.categories ?? [],
  };
}

export async function findBookByGoogleVolumeId(
  googleVolumeId: string,
): Promise<BookRecord | null> {
  const [book] = await sql<BookRow[]>`
    select
      id::text as id,
      google_volume_id as "googleVolumeId",
      title,
      subtitle,
      authors,
      publisher,
      published_date as "publishedDate",
      description,
      isbn10,
      isbn13,
      page_count as "pageCount",
      categories,
      language,
      thumbnail_url as "thumbnailUrl",
      preview_link as "previewLink",
      info_link as "infoLink",
      canonical_link as "canonicalLink",
      raw_google_json as "rawGoogleJson",
      created_at as "createdAt",
      updated_at as "updatedAt"
    from bookapp.books
    where google_volume_id = ${googleVolumeId}
    limit 1
  `;

  return book ? mapBookRow(book) : null;
}

export async function upsertBook(book: NormalizedBook): Promise<BookRecord> {
  const [savedBook] = await sql<BookRow[]>`
    insert into bookapp.books (
      google_volume_id,
      title,
      subtitle,
      authors,
      publisher,
      published_date,
      description,
      isbn10,
      isbn13,
      page_count,
      categories,
      language,
      thumbnail_url,
      preview_link,
      info_link,
      canonical_link,
      raw_google_json
    )
    values (
      ${book.googleVolumeId},
      ${book.title},
      ${book.subtitle},
      ${book.authors},
      ${book.publisher},
      ${book.publishedDate},
      ${book.description},
      ${book.isbn10},
      ${book.isbn13},
      ${book.pageCount},
      ${book.categories},
      ${book.language},
      ${book.thumbnailUrl},
      ${book.previewLink},
      ${book.infoLink},
      ${book.canonicalLink},
      ${JSON.stringify(book.rawGoogleJson)}::jsonb
    )
    on conflict (google_volume_id)
    do update set
      title = excluded.title,
      subtitle = excluded.subtitle,
      authors = excluded.authors,
      publisher = excluded.publisher,
      published_date = excluded.published_date,
      description = excluded.description,
      isbn10 = excluded.isbn10,
      isbn13 = excluded.isbn13,
      page_count = excluded.page_count,
      categories = excluded.categories,
      language = excluded.language,
      thumbnail_url = excluded.thumbnail_url,
      preview_link = excluded.preview_link,
      info_link = excluded.info_link,
      canonical_link = excluded.canonical_link,
      raw_google_json = excluded.raw_google_json,
      updated_at = now()
    returning
      id::text as id,
      google_volume_id as "googleVolumeId",
      title,
      subtitle,
      authors,
      publisher,
      published_date as "publishedDate",
      description,
      isbn10,
      isbn13,
      page_count as "pageCount",
      categories,
      language,
      thumbnail_url as "thumbnailUrl",
      preview_link as "previewLink",
      info_link as "infoLink",
      canonical_link as "canonicalLink",
      raw_google_json as "rawGoogleJson",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `;

  return mapBookRow(savedBook);
}

export async function findBooksByGoogleVolumeIds(
  googleVolumeIds: string[],
): Promise<BookRecord[]> {
  if (googleVolumeIds.length === 0) {
    return [];
  }

  const rows = await sql<BookRow[]>`
    select
      id::text as id,
      google_volume_id as "googleVolumeId",
      title,
      subtitle,
      authors,
      publisher,
      published_date as "publishedDate",
      description,
      isbn10,
      isbn13,
      page_count as "pageCount",
      categories,
      language,
      thumbnail_url as "thumbnailUrl",
      preview_link as "previewLink",
      info_link as "infoLink",
      canonical_link as "canonicalLink",
      raw_google_json as "rawGoogleJson",
      created_at as "createdAt",
      updated_at as "updatedAt"
    from bookapp.books
    where google_volume_id in ${sql(googleVolumeIds)}
  `;

  return rows.map(mapBookRow);
}

export async function ensureBookInDatabase(
  googleVolumeId: string,
  options?: {
    prefetchedBook?: NormalizedBook | null;
  },
): Promise<BookRecord | null> {
  const existingBook = await findBookByGoogleVolumeId(googleVolumeId);
  if (existingBook) {
    return existingBook;
  }

  if (
    options?.prefetchedBook &&
    options.prefetchedBook.googleVolumeId === googleVolumeId
  ) {
    return upsertBook(options.prefetchedBook);
  }

  const googleBook = await fetchGoogleVolume(googleVolumeId);
  if (!googleBook) {
    return null;
  }

  return upsertBook(googleBook);
}

import sql from "@/lib/db";
import { logRepositoryOperation } from "@/lib/repository-logging";
import type { AuthUser } from "@/types/auth";
import type { BookRecord, ReviewRecord, ReviewRating } from "@/types/db";

import { REVIEW_ERROR_MESSAGES, ReviewError } from "@/lib/reviews/errors";
import {
  reviewRatingToStoredSteps,
  storedStepsToReviewRating,
} from "@/lib/reviews/rating";

type ReviewRow = {
  id: string;
  userId: string;
  bookId: string;
  rating: number | null;
  title: string | null;
  body: string | null;
  containsSpoilers: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type ReviewedBookRow = ReviewRow & {
  googleVolumeId: string;
  titleText: string;
  subtitle: string | null;
  authors: string[] | null;
  thumbnailUrl: string | null;
};

type PublicBookReviewRow = ReviewRow & {
  authorName: string | null;
  authorImageUrl: string | null;
};

type BookReviewAggregateRow = {
  averageRating: number | null;
  reviewCount: number;
};

const REPOSITORY_MODULE = "reviews.repository";

export type ReviewedBookEntry = {
  review: ReviewRecord;
  book: Pick<
    BookRecord,
    "id" | "googleVolumeId" | "title" | "subtitle" | "authors" | "thumbnailUrl"
  >;
};

export type BookReviewAggregate = {
  averageRating: number | null;
  reviewCount: number;
};

export type PublicBookReview = {
  review: ReviewRecord;
  author: Pick<AuthUser, "id" | "name" | "imageUrl">;
};

function mapReview(row: ReviewRow): ReviewRecord {
  return {
    ...row,
    rating: storedStepsToReviewRating(row.rating),
  };
}

function mapReviewedBook(row: ReviewedBookRow): ReviewedBookEntry {
  return {
    review: mapReview(row),
    book: {
      id: row.bookId,
      googleVolumeId: row.googleVolumeId,
      title: row.titleText,
      subtitle: row.subtitle,
      authors: row.authors ?? [],
      thumbnailUrl: row.thumbnailUrl,
    },
  };
}

function mapPublicBookReview(row: PublicBookReviewRow): PublicBookReview {
  return {
    review: mapReview(row),
    author: {
      id: row.userId,
      name: row.authorName,
      imageUrl: row.authorImageUrl,
    },
  };
}

export async function findReviewByUserAndBook(input: {
  userId: string;
  bookId: string;
}): Promise<ReviewRecord | null> {
  return logRepositoryOperation(
    {
      context: {
        bookId: input.bookId,
        userId: input.userId,
      },
      module: REPOSITORY_MODULE,
      operation: "findReviewByUserAndBook",
    },
    async () => {
      const [review] = await sql<ReviewRow[]>`
        select
          id::text as id,
          user_id::text as "userId",
          book_id::text as "bookId",
          rating,
          title,
          body,
          contains_spoilers as "containsSpoilers",
          created_at as "createdAt",
          updated_at as "updatedAt",
          deleted_at as "deletedAt"
        from bookapp.reviews
        where user_id = ${input.userId}::uuid
          and book_id = ${input.bookId}::uuid
          and deleted_at is null
        limit 1
      `;

      return review ? mapReview(review) : null;
    },
  );
}

export async function listUserReviewedBooks(
  userId: string,
): Promise<ReviewedBookEntry[]> {
  return logRepositoryOperation(
    {
      context: { userId },
      module: REPOSITORY_MODULE,
      operation: "listUserReviewedBooks",
    },
    async () => {
      const rows = await sql<ReviewedBookRow[]>`
        select
          reviews.id::text as id,
          reviews.user_id::text as "userId",
          reviews.book_id::text as "bookId",
          reviews.rating,
          reviews.title,
          reviews.body,
          reviews.contains_spoilers as "containsSpoilers",
          reviews.created_at as "createdAt",
          reviews.updated_at as "updatedAt",
          reviews.deleted_at as "deletedAt",
          books.google_volume_id as "googleVolumeId",
          books.title as "titleText",
          books.subtitle,
          books.authors,
          books.thumbnail_url as "thumbnailUrl"
        from bookapp.reviews
        inner join bookapp.books on books.id = reviews.book_id
        where reviews.user_id = ${userId}::uuid
          and reviews.deleted_at is null
        order by reviews.updated_at desc, reviews.created_at desc
      `;

      return rows.map(mapReviewedBook);
    },
  );
}

export async function getBookReviewAggregate(
  bookId: string,
): Promise<BookReviewAggregate> {
  return logRepositoryOperation(
    {
      context: { bookId },
      module: REPOSITORY_MODULE,
      operation: "getBookReviewAggregate",
    },
    async () => {
      const [aggregate] = await sql<BookReviewAggregateRow[]>`
        select
          (avg(rating)::float8 / 2) as "averageRating",
          count(*)::int as "reviewCount"
        from bookapp.reviews
        where book_id = ${bookId}::uuid
          and deleted_at is null
      `;

      return {
        averageRating: aggregate?.averageRating ?? null,
        reviewCount: Number(aggregate?.reviewCount ?? 0),
      };
    },
  );
}

export async function listRecentBookReviews(input: {
  bookId: string;
  limit?: number;
}): Promise<PublicBookReview[]> {
  return logRepositoryOperation(
    {
      context: {
        bookId: input.bookId,
        limit: input.limit ?? 5,
      },
      module: REPOSITORY_MODULE,
      operation: "listRecentBookReviews",
    },
    async () => {
      const limit = input.limit ?? 5;
      const rows = await sql<PublicBookReviewRow[]>`
        select
          reviews.id::text as id,
          reviews.user_id::text as "userId",
          reviews.book_id::text as "bookId",
          reviews.rating,
          reviews.title,
          reviews.body,
          reviews.contains_spoilers as "containsSpoilers",
          reviews.created_at as "createdAt",
          reviews.updated_at as "updatedAt",
          reviews.deleted_at as "deletedAt",
          coalesce(users.nickname, users.name) as "authorName",
          users.image_url as "authorImageUrl"
        from bookapp.reviews
        inner join bookapp.users on users.id = reviews.user_id
        where reviews.book_id = ${input.bookId}::uuid
          and reviews.deleted_at is null
        order by reviews.updated_at desc, reviews.created_at desc
        limit ${limit}
      `;

      return rows.map(mapPublicBookReview);
    },
  );
}

export async function upsertReview(input: {
  userId: string;
  bookId: string;
  rating: ReviewRating;
  body: string | null;
  title?: string | null;
  containsSpoilers?: boolean;
}): Promise<ReviewRecord> {
  return logRepositoryOperation(
    {
      context: {
        bookId: input.bookId,
        containsSpoilers: input.containsSpoilers ?? false,
        hasBody: Boolean(input.body),
        hasTitle: Boolean(input.title),
        rating: input.rating,
        userId: input.userId,
      },
      module: REPOSITORY_MODULE,
      operation: "upsertReview",
    },
    async () => {
      const [review] = await sql<ReviewRow[]>`
        insert into bookapp.reviews (
          user_id,
          book_id,
          rating,
          title,
          body,
          contains_spoilers,
          deleted_at
        )
        values (
          ${input.userId}::uuid,
          ${input.bookId}::uuid,
          ${reviewRatingToStoredSteps(input.rating)},
          ${input.title ?? null},
          ${input.body},
          ${input.containsSpoilers ?? false},
          null
        )
        on conflict (user_id, book_id)
        do update set
          rating = excluded.rating,
          title = excluded.title,
          body = excluded.body,
          contains_spoilers = excluded.contains_spoilers,
          deleted_at = null,
          updated_at = now()
        returning
          id::text as id,
          user_id::text as "userId",
          book_id::text as "bookId",
          rating,
          title,
          body,
          contains_spoilers as "containsSpoilers",
          created_at as "createdAt",
          updated_at as "updatedAt",
          deleted_at as "deletedAt"
      `;

      return mapReview(review);
    },
  );
}

export async function deleteReview(input: {
  userId: string;
  bookId: string;
}): Promise<ReviewRecord> {
  return logRepositoryOperation(
    {
      context: {
        bookId: input.bookId,
        userId: input.userId,
      },
      module: REPOSITORY_MODULE,
      operation: "deleteReview",
    },
    async () => {
      const [review] = await sql<ReviewRow[]>`
        update bookapp.reviews
        set deleted_at = now()
        where user_id = ${input.userId}::uuid
          and book_id = ${input.bookId}::uuid
          and deleted_at is null
        returning
          id::text as id,
          user_id::text as "userId",
          book_id::text as "bookId",
          rating,
          title,
          body,
          contains_spoilers as "containsSpoilers",
          created_at as "createdAt",
          updated_at as "updatedAt",
          deleted_at as "deletedAt"
      `;

      if (!review) {
        throw new ReviewError("NOT_FOUND", REVIEW_ERROR_MESSAGES.reviewNotFound);
      }

      return mapReview(review);
    },
  );
}

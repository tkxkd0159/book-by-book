import sql from "@/lib/db";
import { logRepositoryOperation } from "@/lib/repository-logging";
import type { AuthUser } from "@/types/auth";
import type {
  BookRecord,
  ClubBookRecord,
  ClubBookStatus,
  ClubMemberRole,
  ThreadPostRecord,
  ThreadRecord,
} from "@/types/db";

import {
  canDeleteThreads,
  canManageThreadPins,
  canViewThreads,
  isThreadPostAuthor,
} from "@/lib/threads/permissions";
import {
  createThreadCommentCursor,
  createThreadListCursor,
  parseDiscussionLimit,
  parseThreadCommentCursor,
  parseThreadListCursor,
} from "@/lib/threads/validation";
import { ThreadError, THREAD_ERROR_MESSAGES } from "@/lib/threads/errors";

type QueryExecutor = typeof sql;

type MembershipRow = {
  role: ClubMemberRole;
};

type ClubBookContextRow = {
  id: string;
  clubId: string;
  bookId: string;
  status: ClubBookStatus;
  addedById: string;
  sortOrder: number;
  addedAt: Date;
  removedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  googleVolumeId: string;
  title: string;
  subtitle: string | null;
  authors: string[] | null;
  publisher: string | null;
  publishedDate: string | null;
  thumbnailUrl: string | null;
  infoLink: string | null;
};

type ThreadRow = {
  id: string;
  clubId: string;
  clubBookId: string;
  bookId: string;
  authorId: string;
  title: string;
  body: string | null;
  isLocked: boolean;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  cursorCreatedAtMicros?: string;
};

type ThreadSummaryRow = ThreadRow & {
  authorName: string | null;
  authorImageUrl: string | null;
  postCount: number;
};

type ThreadDetailRow = ThreadSummaryRow & {
  clubBookStatus: ClubBookStatus;
  clubBookAddedById: string;
  clubBookSortOrder: number;
  clubBookAddedAt: Date;
  clubBookRemovedAt: Date | null;
  clubBookCreatedAt: Date;
  clubBookUpdatedAt: Date;
  googleVolumeId: string;
  bookTitle: string;
  bookSubtitle: string | null;
  bookAuthors: string[] | null;
  bookPublisher: string | null;
  bookPublishedDate: string | null;
  bookThumbnailUrl: string | null;
  bookInfoLink: string | null;
};

type ThreadPostRow = {
  id: string;
  threadId: string;
  parentPostId: string | null;
  authorId: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  authorName: string | null;
  authorImageUrl: string | null;
  cursorCreatedAtMicros?: string;
};

type ThreadPostForMutationRow = ThreadPostRow & {
  clubId: string;
};

type DiscussionAccessContext = {
  currentUserRole: ClubMemberRole;
  clubBook: DiscussionClubBook;
};

export type ThreadAuthor = Pick<AuthUser, "id" | "name" | "imageUrl">;

export type DiscussionClubBook = ClubBookRecord & {
  book: Pick<
    BookRecord,
    | "id"
    | "googleVolumeId"
    | "title"
    | "subtitle"
    | "authors"
    | "publisher"
    | "publishedDate"
    | "thumbnailUrl"
    | "infoLink"
  >;
};

export type ThreadSummary = ThreadRecord & {
  author: ThreadAuthor;
  postCount: number;
};

export type ThreadPostWithAuthor = ThreadPostRecord & {
  author: ThreadAuthor;
};

export type ThreadComment = ThreadPostWithAuthor & {
  replies: ThreadPostWithAuthor[];
};

export type CursorPaginationResult<T> = {
  items: T[];
  nextCursor: string | null;
  endCursor: string | null;
  hasMore: boolean;
};

export type ThreadDetail = ThreadSummary & {
  clubBook: DiscussionClubBook;
};

const REPOSITORY_MODULE = "threads.repository";

function asQueryExecutor(tx: unknown) {
  return tx as QueryExecutor;
}

function mapThread(row: ThreadRow): ThreadRecord {
  return row;
}

function mapThreadAuthor(row: {
  authorId: string;
  authorName: string | null;
  authorImageUrl: string | null;
}): ThreadAuthor {
  return {
    id: row.authorId,
    name: row.authorName,
    imageUrl: row.authorImageUrl,
  };
}

function mapDiscussionClubBook(row: ClubBookContextRow): DiscussionClubBook {
  return {
    id: row.id,
    clubId: row.clubId,
    bookId: row.bookId,
    status: row.status,
    addedById: row.addedById,
    sortOrder: row.sortOrder,
    addedAt: row.addedAt,
    removedAt: row.removedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    book: {
      id: row.bookId,
      googleVolumeId: row.googleVolumeId,
      title: row.title,
      subtitle: row.subtitle,
      authors: row.authors ?? [],
      publisher: row.publisher,
      publishedDate: row.publishedDate,
      thumbnailUrl: row.thumbnailUrl,
      infoLink: row.infoLink,
    },
  };
}

function mapThreadSummary(row: ThreadSummaryRow): ThreadSummary {
  return {
    ...mapThread(row),
    author: mapThreadAuthor(row),
    postCount: Number(row.postCount ?? 0),
  };
}

function mapThreadPost(row: ThreadPostRow): ThreadPostWithAuthor {
  return {
    id: row.id,
    threadId: row.threadId,
    parentPostId: row.parentPostId,
    authorId: row.authorId,
    body: row.body,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    author: mapThreadAuthor(row),
  };
}

function mapThreadDetail(row: ThreadDetailRow): ThreadDetail {
  return {
    ...mapThreadSummary(row),
    clubBook: {
      id: row.clubBookId,
      clubId: row.clubId,
      bookId: row.bookId,
      status: row.clubBookStatus,
      addedById: row.clubBookAddedById,
      sortOrder: row.clubBookSortOrder,
      addedAt: row.clubBookAddedAt,
      removedAt: row.clubBookRemovedAt,
      createdAt: row.clubBookCreatedAt,
      updatedAt: row.clubBookUpdatedAt,
      book: {
        id: row.bookId,
        googleVolumeId: row.googleVolumeId,
        title: row.bookTitle,
        subtitle: row.bookSubtitle,
        authors: row.bookAuthors ?? [],
        publisher: row.bookPublisher,
        publishedDate: row.bookPublishedDate,
        thumbnailUrl: row.bookThumbnailUrl,
        infoLink: row.bookInfoLink,
      },
    },
  };
}

function createCursorPaginationResult<TRow, TItem>(input: {
  rows: TRow[];
  limit: number;
  mapItem: (row: TRow) => TItem;
  getCursor: (row: TRow) => string;
}): CursorPaginationResult<TItem> {
  const hasMore = input.rows.length > input.limit;
  const visibleRows = hasMore
    ? input.rows.slice(0, input.limit)
    : input.rows;
  const lastRow = visibleRows.at(-1) ?? null;
  const endCursor = lastRow ? input.getCursor(lastRow) : null;
  return {
    items: visibleRows.map(input.mapItem),
    nextCursor: hasMore ? endCursor : null,
    endCursor,
    hasMore,
  };
}

async function getMembership(
  query: QueryExecutor,
  clubId: string,
  userId: string,
) {
  const [membership] = await query<MembershipRow[]>`
    select role
    from bookapp.club_members
    where club_id = ${clubId}::uuid
      and user_id = ${userId}::uuid
    limit 1
  `;

  return membership ?? null;
}

async function getDiscussionClubBook(
  query: QueryExecutor,
  clubId: string,
  clubBookId: string,
) {
  const [clubBook] = await query<ClubBookContextRow[]>`
    select
      club_books.id::text as id,
      club_books.club_id::text as "clubId",
      club_books.book_id::text as "bookId",
      club_books.status,
      club_books.added_by_id::text as "addedById",
      club_books.sort_order as "sortOrder",
      club_books.added_at as "addedAt",
      club_books.removed_at as "removedAt",
      club_books.created_at as "createdAt",
      club_books.updated_at as "updatedAt",
      books.google_volume_id as "googleVolumeId",
      books.title,
      books.subtitle,
      books.authors,
      books.publisher,
      books.published_date as "publishedDate",
      books.thumbnail_url as "thumbnailUrl",
      books.info_link as "infoLink"
    from bookapp.club_books
    join bookapp.books on books.id = club_books.book_id
    where club_books.club_id = ${clubId}::uuid
      and club_books.id = ${clubBookId}::uuid
    limit 1
  `;

  return clubBook ? mapDiscussionClubBook(clubBook) : null;
}

async function getDiscussionAccessContext(
  query: QueryExecutor,
  input: {
    clubId: string;
    clubBookId: string;
    userId: string;
  },
): Promise<DiscussionAccessContext> {
  const membership = await getMembership(query, input.clubId, input.userId);
  if (!membership || !canViewThreads(membership.role)) {
    throw new ThreadError(
      "NOT_FOUND",
      THREAD_ERROR_MESSAGES.discussionNotFound,
    );
  }

  return getDiscussionAccessContextForMember(query, {
    clubId: input.clubId,
    clubBookId: input.clubBookId,
    currentUserRole: membership.role,
  });
}

async function getDiscussionAccessContextForMember(
  query: QueryExecutor,
  input: {
    clubId: string;
    clubBookId: string;
    currentUserRole: ClubMemberRole;
  },
): Promise<DiscussionAccessContext> {
  if (!canViewThreads(input.currentUserRole)) {
    throw new ThreadError(
      "NOT_FOUND",
      THREAD_ERROR_MESSAGES.discussionNotFound,
    );
  }

  const clubBook = await getDiscussionClubBook(
    query,
    input.clubId,
    input.clubBookId,
  );
  if (!clubBook) {
    throw new ThreadError(
      "NOT_FOUND",
      THREAD_ERROR_MESSAGES.discussionNotFound,
    );
  }

  return {
    currentUserRole: input.currentUserRole,
    clubBook,
  };
}

async function getThreadForPinUpdate(
  query: QueryExecutor,
  clubId: string,
  threadId: string,
) {
  const [thread] = await query<ThreadRow[]>`
    select
      id::text as id,
      club_id::text as "clubId",
      club_book_id::text as "clubBookId",
      book_id::text as "bookId",
      author_id::text as "authorId",
      title,
      body,
      is_locked as "isLocked",
      is_pinned as "isPinned",
      created_at as "createdAt",
      updated_at as "updatedAt",
      deleted_at as "deletedAt"
    from bookapp.threads
    where id = ${threadId}::uuid
      and club_id = ${clubId}::uuid
      and deleted_at is null
    limit 1
  `;

  return thread ? mapThread(thread) : null;
}

async function getThreadPostForMutation(
  query: QueryExecutor,
  clubId: string,
  postId: string,
) {
  const [post] = await query<ThreadPostForMutationRow[]>`
    select
      thread_posts.id::text as id,
      thread_posts.thread_id::text as "threadId",
      thread_posts.parent_post_id::text as "parentPostId",
      thread_posts.author_id::text as "authorId",
      thread_posts.body,
      thread_posts.created_at as "createdAt",
      thread_posts.updated_at as "updatedAt",
      thread_posts.deleted_at as "deletedAt",
      coalesce(users.nickname, users.name) as "authorName",
      users.image_url as "authorImageUrl",
      threads.club_id::text as "clubId"
    from bookapp.thread_posts
    join bookapp.threads on threads.id = thread_posts.thread_id
    join bookapp.users on users.id = thread_posts.author_id
    where thread_posts.id = ${postId}::uuid
      and threads.club_id = ${clubId}::uuid
      and threads.deleted_at is null
    limit 1
  `;

  return post ?? null;
}

async function getReplyTargetPost(
  query: QueryExecutor,
  threadId: string,
  postId: string,
) {
  const [post] = await query<ThreadPostRow[]>`
    select
      thread_posts.id::text as id,
      thread_posts.thread_id::text as "threadId",
      thread_posts.parent_post_id::text as "parentPostId",
      thread_posts.author_id::text as "authorId",
      thread_posts.body,
      thread_posts.created_at as "createdAt",
      thread_posts.updated_at as "updatedAt",
      thread_posts.deleted_at as "deletedAt",
      coalesce(users.nickname, users.name) as "authorName",
      users.image_url as "authorImageUrl"
    from bookapp.thread_posts
    join bookapp.users on users.id = thread_posts.author_id
    where thread_posts.id = ${postId}::uuid
      and thread_posts.thread_id = ${threadId}::uuid
    limit 1
  `;

  return post ?? null;
}

export async function findDiscussionClubBook(input: {
  clubId: string;
  clubBookId: string;
  userId: string;
}) {
  return logRepositoryOperation(
    {
      context: {
        clubBookId: input.clubBookId,
        clubId: input.clubId,
        userId: input.userId,
      },
      module: REPOSITORY_MODULE,
      operation: "findDiscussionClubBook",
    },
    () => getDiscussionAccessContext(sql, input),
  );
}

export async function findDiscussionClubBookForMember(input: {
  clubId: string;
  clubBookId: string;
  currentUserRole: ClubMemberRole;
}) {
  return logRepositoryOperation(
    {
      context: {
        clubBookId: input.clubBookId,
        clubId: input.clubId,
        currentUserRole: input.currentUserRole,
      },
      module: REPOSITORY_MODULE,
      operation: "findDiscussionClubBookForMember",
    },
    () => getDiscussionAccessContextForMember(sql, input),
  );
}

async function listThreadsForClubBookQuery(
  query: QueryExecutor,
  input: {
    clubId: string;
    clubBookId: string;
    afterCursor?: string | null;
    limit?: number | null;
  },
) {
  const limit = parseDiscussionLimit(input.limit);
  const afterCursor = parseThreadListCursor(input.afterCursor);
  const queryLimit = limit + 1;

  const rows = afterCursor
    ? await query<ThreadSummaryRow[]>`
      select
        threads.id::text as id,
        threads.club_id::text as "clubId",
        threads.club_book_id::text as "clubBookId",
        threads.book_id::text as "bookId",
        threads.author_id::text as "authorId",
        threads.title,
        threads.body,
        threads.is_locked as "isLocked",
        threads.is_pinned as "isPinned",
        threads.created_at as "createdAt",
        ((extract(epoch from threads.created_at) * 1000000)::bigint)::text as "cursorCreatedAtMicros",
        threads.updated_at as "updatedAt",
        threads.deleted_at as "deletedAt",
        coalesce(users.nickname, users.name) as "authorName",
        users.image_url as "authorImageUrl",
        threads.post_count as "postCount"
      from bookapp.threads
      join bookapp.users on users.id = threads.author_id
      where threads.club_id = ${input.clubId}::uuid
        and threads.club_book_id = ${input.clubBookId}::uuid
        and threads.deleted_at is null
        and (
          threads.is_pinned < ${afterCursor.isPinned}
          or (
            threads.is_pinned = ${afterCursor.isPinned}
            and (extract(epoch from threads.created_at) * 1000000)::bigint
              < ${afterCursor.createdAtMicros}::bigint
          )
          or (
            threads.is_pinned = ${afterCursor.isPinned}
            and (extract(epoch from threads.created_at) * 1000000)::bigint
              = ${afterCursor.createdAtMicros}::bigint
            and threads.id < ${afterCursor.id}::uuid
          )
        )
      order by threads.is_pinned desc, threads.created_at desc, threads.id desc
      limit ${queryLimit}
    `
    : await query<ThreadSummaryRow[]>`
      select
        threads.id::text as id,
        threads.club_id::text as "clubId",
        threads.club_book_id::text as "clubBookId",
        threads.book_id::text as "bookId",
        threads.author_id::text as "authorId",
        threads.title,
        threads.body,
        threads.is_locked as "isLocked",
        threads.is_pinned as "isPinned",
        threads.created_at as "createdAt",
        ((extract(epoch from threads.created_at) * 1000000)::bigint)::text as "cursorCreatedAtMicros",
        threads.updated_at as "updatedAt",
        threads.deleted_at as "deletedAt",
        coalesce(users.nickname, users.name) as "authorName",
        users.image_url as "authorImageUrl",
        threads.post_count as "postCount"
      from bookapp.threads
      join bookapp.users on users.id = threads.author_id
      where threads.club_id = ${input.clubId}::uuid
        and threads.club_book_id = ${input.clubBookId}::uuid
        and threads.deleted_at is null
      order by threads.is_pinned desc, threads.created_at desc, threads.id desc
      limit ${queryLimit}
    `;

  return createCursorPaginationResult({
    rows,
    limit,
    mapItem: mapThreadSummary,
    getCursor: (row) =>
      createThreadListCursor({
        isPinned: row.isPinned,
        createdAtMicros: row.cursorCreatedAtMicros ?? row.createdAt.getTime() * 1000,
        id: row.id,
      }),
  });
}

export async function loadDiscussionDataForMember(input: {
  clubId: string;
  clubBookId: string;
  currentUserRole: ClubMemberRole;
  afterCursor?: string | null;
  limit?: number | null;
}) {
  return logRepositoryOperation(
    {
      context: {
        afterCursor: Boolean(input.afterCursor),
        clubBookId: input.clubBookId,
        clubId: input.clubId,
        currentUserRole: input.currentUserRole,
        limit: input.limit,
      },
      module: REPOSITORY_MODULE,
      operation: "loadDiscussionDataForMember",
    },
    async () => {
      const discussion = await getDiscussionAccessContextForMember(sql, input);
      const threads = await listThreadsForClubBookQuery(sql, input);

      return { discussion, threads };
    },
  );
}

export async function listThreadsForClubBook(input: {
  clubId: string;
  clubBookId: string;
  userId: string;
  afterCursor?: string | null;
  limit?: number | null;
}) {
  return logRepositoryOperation(
    {
      context: {
        afterCursor: Boolean(input.afterCursor),
        clubBookId: input.clubBookId,
        clubId: input.clubId,
        limit: input.limit,
        userId: input.userId,
      },
      module: REPOSITORY_MODULE,
      operation: "listThreadsForClubBook",
    },
    async () => {
      await getDiscussionAccessContext(sql, input);

      return listThreadsForClubBookQuery(sql, input);
    },
  );
}

export async function listThreadsForClubBookForMember(input: {
  clubId: string;
  clubBookId: string;
  currentUserRole: ClubMemberRole;
  afterCursor?: string | null;
  limit?: number | null;
}) {
  return logRepositoryOperation(
    {
      context: {
        afterCursor: Boolean(input.afterCursor),
        clubBookId: input.clubBookId,
        clubId: input.clubId,
        currentUserRole: input.currentUserRole,
        limit: input.limit,
      },
      module: REPOSITORY_MODULE,
      operation: "listThreadsForClubBookForMember",
    },
    async () => {
      await getDiscussionAccessContextForMember(sql, input);

      return listThreadsForClubBookQuery(sql, input);
    },
  );
}

export async function createThread(input: {
  clubId: string;
  clubBookId: string;
  authorId: string;
  title: string;
  body: string | null;
}) {
  return logRepositoryOperation(
    {
      context: {
        authorId: input.authorId,
        clubBookId: input.clubBookId,
        clubId: input.clubId,
        hasBody: Boolean(input.body),
      },
      module: REPOSITORY_MODULE,
      operation: "createThread",
      transactional: true,
    },
    () =>
      sql.begin(async (tx) => {
        const query = asQueryExecutor(tx);
        const membership = await getMembership(query, input.clubId, input.authorId);
        if (!membership || !canViewThreads(membership.role)) {
          throw new ThreadError(
            "NOT_FOUND",
            THREAD_ERROR_MESSAGES.discussionNotFound,
          );
        }

        const clubBook = await getDiscussionClubBook(
          query,
          input.clubId,
          input.clubBookId,
        );
        if (!clubBook) {
          throw new ThreadError(
            "NOT_FOUND",
            THREAD_ERROR_MESSAGES.discussionNotFound,
          );
        }

        if (clubBook.removedAt) {
          throw new ThreadError(
            "FORBIDDEN",
            "Archived club books cannot accept new threads.",
          );
        }

        const [thread] = await query<ThreadRow[]>`
          insert into bookapp.threads (
            club_id,
            club_book_id,
            book_id,
            author_id,
            title,
            body
          )
          values (
            ${input.clubId}::uuid,
            ${input.clubBookId}::uuid,
            ${clubBook.bookId}::uuid,
            ${input.authorId}::uuid,
            ${input.title},
            ${input.body}
          )
          returning
            id::text as id,
            club_id::text as "clubId",
            club_book_id::text as "clubBookId",
            book_id::text as "bookId",
            author_id::text as "authorId",
            title,
            body,
            is_locked as "isLocked",
            is_pinned as "isPinned",
            created_at as "createdAt",
            updated_at as "updatedAt",
            deleted_at as "deletedAt"
        `;

        return mapThread(thread);
      }),
  );
}

export async function findThreadDetail(input: {
  clubId: string;
  threadId: string;
  userId: string;
  afterCursor?: string | null;
  limit?: number | null;
}) {
  return logRepositoryOperation(
    {
      context: {
        afterCursor: Boolean(input.afterCursor),
        clubId: input.clubId,
        limit: input.limit,
        threadId: input.threadId,
        userId: input.userId,
      },
      module: REPOSITORY_MODULE,
      operation: "findThreadDetail",
    },
    async () => {
      const membership = await getMembership(sql, input.clubId, input.userId);
      if (!membership || !canViewThreads(membership.role)) {
        throw new ThreadError("NOT_FOUND", THREAD_ERROR_MESSAGES.threadNotFound);
      }

      return findThreadDetailForMember({
        clubId: input.clubId,
        threadId: input.threadId,
        currentUserRole: membership.role,
        afterCursor: input.afterCursor,
        limit: input.limit,
      });
    },
  );
}

export async function findThreadDetailForMember(input: {
  clubId: string;
  threadId: string;
  currentUserRole: ClubMemberRole;
  afterCursor?: string | null;
  limit?: number | null;
}) {
  return logRepositoryOperation(
    {
      context: {
        afterCursor: Boolean(input.afterCursor),
        clubId: input.clubId,
        currentUserRole: input.currentUserRole,
        limit: input.limit,
        threadId: input.threadId,
      },
      module: REPOSITORY_MODULE,
      operation: "findThreadDetailForMember",
    },
    async () => {
      if (!canViewThreads(input.currentUserRole)) {
        throw new ThreadError("NOT_FOUND", THREAD_ERROR_MESSAGES.threadNotFound);
      }

      const limit = parseDiscussionLimit(input.limit);
      const afterCursor = parseThreadCommentCursor(input.afterCursor);
      const queryLimit = limit + 1;

      const [threadRow] = await sql<ThreadDetailRow[]>`
        select
          threads.id::text as id,
          threads.club_id::text as "clubId",
          threads.club_book_id::text as "clubBookId",
          threads.book_id::text as "bookId",
          threads.author_id::text as "authorId",
          threads.title,
          threads.body,
          threads.is_locked as "isLocked",
          threads.is_pinned as "isPinned",
          threads.created_at as "createdAt",
          threads.updated_at as "updatedAt",
          threads.deleted_at as "deletedAt",
          coalesce(thread_author.nickname, thread_author.name) as "authorName",
          thread_author.image_url as "authorImageUrl",
          threads.post_count as "postCount",
          club_books.status as "clubBookStatus",
          club_books.added_by_id::text as "clubBookAddedById",
          club_books.sort_order as "clubBookSortOrder",
          club_books.added_at as "clubBookAddedAt",
          club_books.removed_at as "clubBookRemovedAt",
          club_books.created_at as "clubBookCreatedAt",
          club_books.updated_at as "clubBookUpdatedAt",
          books.google_volume_id as "googleVolumeId",
          books.title as "bookTitle",
          books.subtitle as "bookSubtitle",
          books.authors as "bookAuthors",
          books.publisher as "bookPublisher",
          books.published_date as "bookPublishedDate",
          books.thumbnail_url as "bookThumbnailUrl",
          books.info_link as "bookInfoLink"
        from bookapp.threads
        join bookapp.club_books
          on club_books.id = threads.club_book_id
         and club_books.club_id = threads.club_id
        join bookapp.books on books.id = threads.book_id
        join bookapp.users thread_author on thread_author.id = threads.author_id
        where threads.id = ${input.threadId}::uuid
          and threads.club_id = ${input.clubId}::uuid
          and threads.deleted_at is null
        limit 1
      `;

      if (!threadRow) {
        throw new ThreadError("NOT_FOUND", THREAD_ERROR_MESSAGES.threadNotFound);
      }

      const topLevelRows = afterCursor
        ? await sql<ThreadPostRow[]>`
          select
            thread_posts.id::text as id,
            thread_posts.thread_id::text as "threadId",
            thread_posts.parent_post_id::text as "parentPostId",
            thread_posts.author_id::text as "authorId",
            thread_posts.body,
            thread_posts.created_at as "createdAt",
            ((extract(epoch from thread_posts.created_at) * 1000000)::bigint)::text as "cursorCreatedAtMicros",
            thread_posts.updated_at as "updatedAt",
            thread_posts.deleted_at as "deletedAt",
            coalesce(users.nickname, users.name) as "authorName",
            users.image_url as "authorImageUrl"
          from bookapp.thread_posts
          join bookapp.users on users.id = thread_posts.author_id
          where thread_posts.thread_id = ${input.threadId}::uuid
            and thread_posts.parent_post_id is null
            and (
              (extract(epoch from thread_posts.created_at) * 1000000)::bigint
                > ${afterCursor.createdAtMicros}::bigint
              or (
                (extract(epoch from thread_posts.created_at) * 1000000)::bigint
                  = ${afterCursor.createdAtMicros}::bigint
                and thread_posts.id > ${afterCursor.id}::uuid
              )
            )
          order by thread_posts.created_at asc, thread_posts.id asc
          limit ${queryLimit}
        `
        : await sql<ThreadPostRow[]>`
          select
            thread_posts.id::text as id,
            thread_posts.thread_id::text as "threadId",
            thread_posts.parent_post_id::text as "parentPostId",
            thread_posts.author_id::text as "authorId",
            thread_posts.body,
            thread_posts.created_at as "createdAt",
            ((extract(epoch from thread_posts.created_at) * 1000000)::bigint)::text as "cursorCreatedAtMicros",
            thread_posts.updated_at as "updatedAt",
            thread_posts.deleted_at as "deletedAt",
            coalesce(users.nickname, users.name) as "authorName",
            users.image_url as "authorImageUrl"
          from bookapp.thread_posts
          join bookapp.users on users.id = thread_posts.author_id
          where thread_posts.thread_id = ${input.threadId}::uuid
            and thread_posts.parent_post_id is null
          order by thread_posts.created_at asc, thread_posts.id asc
          limit ${queryLimit}
        `;

      const hasMore = topLevelRows.length > limit;
      const visibleTopLevelRows = hasMore
        ? topLevelRows.slice(0, limit)
        : topLevelRows;
      const topLevelIds = visibleTopLevelRows.map((post) => post.id);
      const replyRows = topLevelIds.length > 0
        ? await sql<ThreadPostRow[]>`
          select
            thread_posts.id::text as id,
            thread_posts.thread_id::text as "threadId",
            thread_posts.parent_post_id::text as "parentPostId",
            thread_posts.author_id::text as "authorId",
            thread_posts.body,
            thread_posts.created_at as "createdAt",
            thread_posts.updated_at as "updatedAt",
            thread_posts.deleted_at as "deletedAt",
            coalesce(users.nickname, users.name) as "authorName",
            users.image_url as "authorImageUrl"
          from bookapp.thread_posts
          join bookapp.users on users.id = thread_posts.author_id
          where thread_posts.thread_id = ${input.threadId}::uuid
            and thread_posts.parent_post_id in ${sql(topLevelIds)}
          order by
            thread_posts.parent_post_id asc,
            thread_posts.created_at asc,
            thread_posts.id asc
        `
        : [];

      const repliesByParentId = new Map<string, ThreadPostWithAuthor[]>();
      for (const reply of replyRows) {
        const parentPostId = reply.parentPostId;
        if (!parentPostId) {
          continue;
        }

        const entries = repliesByParentId.get(parentPostId) ?? [];
        entries.push(mapThreadPost(reply));
        repliesByParentId.set(parentPostId, entries);
      }

      const lastVisibleRow = visibleTopLevelRows.at(-1) ?? null;
      const endCursor = lastVisibleRow
        ? createThreadCommentCursor({
          createdAtMicros:
              lastVisibleRow.cursorCreatedAtMicros
              ?? lastVisibleRow.createdAt.getTime() * 1000,
          id: lastVisibleRow.id,
        })
        : null;

      return {
        currentUserRole: input.currentUserRole,
        thread: mapThreadDetail(threadRow),
        posts: {
          items: visibleTopLevelRows.map((post) => ({
            ...mapThreadPost(post),
            replies: repliesByParentId.get(post.id) ?? [],
          })),
          nextCursor: hasMore ? endCursor : null,
          endCursor,
          hasMore,
        },
      };
    },
  );
}

export async function createThreadPost(input: {
  clubId: string;
  threadId: string;
  authorId: string;
  body: string;
  parentPostId?: string | null;
}) {
  return logRepositoryOperation(
    {
      context: {
        authorId: input.authorId,
        clubId: input.clubId,
        hasParentPostId: Boolean(input.parentPostId),
        threadId: input.threadId,
      },
      module: REPOSITORY_MODULE,
      operation: "createThreadPost",
      transactional: true,
    },
    () =>
      sql.begin(async (tx) => {
        const query = asQueryExecutor(tx);
        const membership = await getMembership(query, input.clubId, input.authorId);
        if (!membership || !canViewThreads(membership.role)) {
          throw new ThreadError("NOT_FOUND", THREAD_ERROR_MESSAGES.threadNotFound);
        }

        const thread = await getThreadForPinUpdate(query, input.clubId, input.threadId);
        if (!thread) {
          throw new ThreadError("NOT_FOUND", THREAD_ERROR_MESSAGES.threadNotFound);
        }

        let parentPostId: string | null = null;
        if (input.parentPostId) {
          const parentPost = await getReplyTargetPost(
            query,
            thread.id,
            input.parentPostId,
          );

          if (!parentPost) {
            throw new ThreadError(
              "NOT_FOUND",
              THREAD_ERROR_MESSAGES.replyTargetNotFound,
            );
          }

          if (parentPost.parentPostId) {
            throw new ThreadError(
              "CONFLICT",
              THREAD_ERROR_MESSAGES.replyTargetTopLevelOnly,
            );
          }

          if (parentPost.deletedAt) {
            throw new ThreadError(
              "CONFLICT",
              THREAD_ERROR_MESSAGES.deletedReplyTarget,
            );
          }

          parentPostId = parentPost.id;
        }

        const [post] = await query<ThreadPostRow[]>`
          insert into bookapp.thread_posts (
            thread_id,
            parent_post_id,
            author_id,
            body
          )
          values (
            ${thread.id}::uuid,
            ${parentPostId}::uuid,
            ${input.authorId}::uuid,
            ${input.body}
          )
          returning
            id::text as id,
            thread_id::text as "threadId",
            parent_post_id::text as "parentPostId",
            author_id::text as "authorId",
            body,
            created_at as "createdAt",
            updated_at as "updatedAt",
            deleted_at as "deletedAt",
            (
              select coalesce(nickname, name)
              from bookapp.users
              where users.id = thread_posts.author_id
            ) as "authorName",
            (
              select image_url
              from bookapp.users
              where users.id = thread_posts.author_id
            ) as "authorImageUrl"
        `;

        return mapThreadPost(post);
      }),
  );
}

export async function editThreadPost(input: {
  clubId: string;
  postId: string;
  editorId: string;
  body: string;
}) {
  return logRepositoryOperation(
    {
      context: {
        clubId: input.clubId,
        editorId: input.editorId,
        postId: input.postId,
      },
      module: REPOSITORY_MODULE,
      operation: "editThreadPost",
      transactional: true,
    },
    () =>
      sql.begin(async (tx) => {
        const query = asQueryExecutor(tx);
        const membership = await getMembership(query, input.clubId, input.editorId);
        if (!membership || !canViewThreads(membership.role)) {
          throw new ThreadError("NOT_FOUND", THREAD_ERROR_MESSAGES.postNotFound);
        }

        const existing = await getThreadPostForMutation(query, input.clubId, input.postId);
        if (!existing) {
          throw new ThreadError("NOT_FOUND", THREAD_ERROR_MESSAGES.postNotFound);
        }

        if (!isThreadPostAuthor(existing.authorId, input.editorId)) {
          throw new ThreadError("FORBIDDEN", THREAD_ERROR_MESSAGES.postAuthorOnly);
        }

        if (existing.deletedAt) {
          throw new ThreadError("CONFLICT", THREAD_ERROR_MESSAGES.deletedPostEdit);
        }

        const [updated] = await query<ThreadPostRow[]>`
          update bookapp.thread_posts
          set
            body = ${input.body},
            updated_at = now()
          where id = ${input.postId}::uuid
          returning
            id::text as id,
            thread_id::text as "threadId",
            parent_post_id::text as "parentPostId",
            author_id::text as "authorId",
            body,
            created_at as "createdAt",
            updated_at as "updatedAt",
            deleted_at as "deletedAt",
            (
              select coalesce(nickname, name)
              from bookapp.users
              where users.id = thread_posts.author_id
            ) as "authorName",
            (
              select image_url
              from bookapp.users
              where users.id = thread_posts.author_id
            ) as "authorImageUrl"
        `;

        return mapThreadPost(updated);
      }),
  );
}

export async function deleteThreadPost(input: {
  clubId: string;
  postId: string;
  deletedById: string;
}) {
  return logRepositoryOperation(
    {
      context: {
        clubId: input.clubId,
        deletedById: input.deletedById,
        postId: input.postId,
      },
      module: REPOSITORY_MODULE,
      operation: "deleteThreadPost",
      transactional: true,
    },
    () =>
      sql.begin(async (tx) => {
        const query = asQueryExecutor(tx);
        const membership = await getMembership(query, input.clubId, input.deletedById);
        if (!membership || !canViewThreads(membership.role)) {
          throw new ThreadError("NOT_FOUND", THREAD_ERROR_MESSAGES.postNotFound);
        }

        const existing = await getThreadPostForMutation(query, input.clubId, input.postId);
        if (!existing) {
          throw new ThreadError("NOT_FOUND", THREAD_ERROR_MESSAGES.postNotFound);
        }

        if (!isThreadPostAuthor(existing.authorId, input.deletedById)) {
          throw new ThreadError("FORBIDDEN", THREAD_ERROR_MESSAGES.postAuthorOnly);
        }

        if (existing.deletedAt) {
          return mapThreadPost(existing);
        }

        const [updated] = await query<ThreadPostRow[]>`
          update bookapp.thread_posts
          set
            deleted_at = now(),
            updated_at = now()
          where id = ${input.postId}::uuid
          returning
            id::text as id,
            thread_id::text as "threadId",
            parent_post_id::text as "parentPostId",
            author_id::text as "authorId",
            body,
            created_at as "createdAt",
            updated_at as "updatedAt",
            deleted_at as "deletedAt",
            (
              select coalesce(nickname, name)
              from bookapp.users
              where users.id = thread_posts.author_id
            ) as "authorName",
            (
              select image_url
              from bookapp.users
              where users.id = thread_posts.author_id
            ) as "authorImageUrl"
        `;

        return mapThreadPost(updated);
      }),
  );
}

export async function deleteThread(input: {
  clubId: string;
  threadId: string;
  deletedById: string;
}) {
  return logRepositoryOperation(
    {
      context: {
        clubId: input.clubId,
        deletedById: input.deletedById,
        threadId: input.threadId,
      },
      module: REPOSITORY_MODULE,
      operation: "deleteThread",
      transactional: true,
    },
    () =>
      sql.begin(async (tx) => {
        const query = asQueryExecutor(tx);
        const membership = await getMembership(query, input.clubId, input.deletedById);
        if (!membership || !canDeleteThreads(membership.role)) {
          throw new ThreadError(
            membership ? "FORBIDDEN" : "NOT_FOUND",
            "Only club admins can delete threads.",
          );
        }

        const thread = await getThreadForPinUpdate(query, input.clubId, input.threadId);
        if (!thread) {
          throw new ThreadError("NOT_FOUND", THREAD_ERROR_MESSAGES.threadNotFound);
        }

        const [deleted] = await query<ThreadRow[]>`
          delete from bookapp.threads
          where id = ${input.threadId}::uuid
            and club_id = ${input.clubId}::uuid
          returning
            id::text as id,
            club_id::text as "clubId",
            club_book_id::text as "clubBookId",
            book_id::text as "bookId",
            author_id::text as "authorId",
            title,
            body,
            is_locked as "isLocked",
            is_pinned as "isPinned",
            created_at as "createdAt",
            updated_at as "updatedAt",
            deleted_at as "deletedAt"
        `;

        return mapThread(deleted);
      }),
  );
}

async function setThreadPinnedState(input: {
  clubId: string;
  threadId: string;
  actorId: string;
  isPinned: boolean;
}) {
  return sql.begin(async (tx) => {
    const query = asQueryExecutor(tx);
    const membership = await getMembership(query, input.clubId, input.actorId);
    if (!membership || !canManageThreadPins(membership.role)) {
      throw new ThreadError(
        membership ? "FORBIDDEN" : "NOT_FOUND",
        "Only club admins can pin threads.",
      );
    }

    const thread = await getThreadForPinUpdate(query, input.clubId, input.threadId);
    if (!thread) {
      throw new ThreadError("NOT_FOUND", THREAD_ERROR_MESSAGES.threadNotFound);
    }

    const [updated] = await query<ThreadRow[]>`
      update bookapp.threads
      set
        is_pinned = ${input.isPinned},
        updated_at = now()
      where id = ${input.threadId}::uuid
        and club_id = ${input.clubId}::uuid
      returning
        id::text as id,
        club_id::text as "clubId",
        club_book_id::text as "clubBookId",
        book_id::text as "bookId",
        author_id::text as "authorId",
        title,
        body,
        is_locked as "isLocked",
        is_pinned as "isPinned",
        created_at as "createdAt",
        updated_at as "updatedAt",
        deleted_at as "deletedAt"
    `;

    return mapThread(updated);
  });
}

export function pinThread(input: {
  clubId: string;
  threadId: string;
  pinnedById: string;
}) {
  return logRepositoryOperation(
    {
      context: {
        clubId: input.clubId,
        pinnedById: input.pinnedById,
        threadId: input.threadId,
      },
      module: REPOSITORY_MODULE,
      operation: "pinThread",
      transactional: true,
    },
    () =>
      setThreadPinnedState({
        clubId: input.clubId,
        threadId: input.threadId,
        actorId: input.pinnedById,
        isPinned: true,
      }),
  );
}

export function unpinThread(input: {
  clubId: string;
  threadId: string;
  unpinnedById: string;
}) {
  return logRepositoryOperation(
    {
      context: {
        clubId: input.clubId,
        threadId: input.threadId,
        unpinnedById: input.unpinnedById,
      },
      module: REPOSITORY_MODULE,
      operation: "unpinThread",
      transactional: true,
    },
    () =>
      setThreadPinnedState({
        clubId: input.clubId,
        threadId: input.threadId,
        actorId: input.unpinnedById,
        isPinned: false,
      }),
  );
}

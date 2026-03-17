import type {
  CursorPaginationResult,
  ThreadComment,
  ThreadSummary,
  ThreadPostWithAuthor,
} from "@/lib/threads/repository";

export type SerializedThreadSummary = Omit<
  ThreadSummary,
  "createdAt" | "updatedAt" | "deletedAt"
> & {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type SerializedThreadPost = Omit<
  ThreadPostWithAuthor,
  "createdAt" | "updatedAt" | "deletedAt"
> & {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type SerializedThreadComment = Omit<ThreadComment, "createdAt" | "updatedAt" | "deletedAt" | "replies"> & {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  replies: SerializedThreadPost[];
};

export function serializeThreadSummary(thread: ThreadSummary): SerializedThreadSummary {
  return {
    ...thread,
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString(),
    deletedAt: thread.deletedAt?.toISOString() ?? null,
  };
}

export function deserializeThreadSummary(thread: SerializedThreadSummary): ThreadSummary {
  return {
    ...thread,
    createdAt: new Date(thread.createdAt),
    updatedAt: new Date(thread.updatedAt),
    deletedAt: thread.deletedAt ? new Date(thread.deletedAt) : null,
  };
}

export function serializeThreadPost(post: ThreadPostWithAuthor): SerializedThreadPost {
  return {
    ...post,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    deletedAt: post.deletedAt?.toISOString() ?? null,
  };
}

export function deserializeThreadPost(post: SerializedThreadPost): ThreadPostWithAuthor {
  return {
    ...post,
    createdAt: new Date(post.createdAt),
    updatedAt: new Date(post.updatedAt),
    deletedAt: post.deletedAt ? new Date(post.deletedAt) : null,
  };
}

export function serializeThreadComment(comment: ThreadComment): SerializedThreadComment {
  return {
    ...serializeThreadPost(comment),
    replies: comment.replies.map(serializeThreadPost),
  };
}

export function deserializeThreadComment(
  comment: SerializedThreadComment,
): ThreadComment {
  return {
    ...deserializeThreadPost(comment),
    replies: comment.replies.map(deserializeThreadPost),
  };
}

export function serializeCursorPaginationResult<T, SerializedT>(
  result: CursorPaginationResult<T>,
  serializeItem: (item: T) => SerializedT,
): CursorPaginationResult<SerializedT> {
  return {
    items: result.items.map(serializeItem),
    nextCursor: result.nextCursor,
    endCursor: result.endCursor,
    hasMore: result.hasMore,
  };
}

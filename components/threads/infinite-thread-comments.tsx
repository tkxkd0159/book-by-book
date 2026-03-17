"use client";

import { LoaderCircle } from "lucide-react";

import { ThreadPostCard } from "@/components/threads/thread-post-card";
import { useInfiniteCursorFeed } from "@/components/threads/use-infinite-cursor-feed";
import { Button } from "@/components/ui/button";
import { createDiscussionRestoreHref } from "@/lib/threads/presentation";
import type {
  CursorPaginationResult,
  ThreadComment,
} from "@/lib/threads/repository";
import {
  deserializeThreadComment,
  type SerializedThreadComment,
} from "@/lib/threads/serialization";

type InfiniteThreadCommentsProps = {
  clubId: string;
  threadId: string;
  basePath: string;
  currentUserId: string;
  posts: CursorPaginationResult<ThreadComment>;
  initialRestoreAfter?: string | null;
  initialFocusPostId?: string | null;
};

async function fetchThreadPostsPage(input: {
  clubId: string;
  threadId: string;
  after: string;
}) {
  const response = await fetch(
    `/api/clubs/${encodeURIComponent(input.clubId)}/threads/${encodeURIComponent(input.threadId)}/posts?after=${encodeURIComponent(input.after)}`,
    {
      cache: "no-store",
      credentials: "same-origin",
    },
  );

  const payload = await response.json() as
    | CursorPaginationResult<SerializedThreadComment>
    | { error?: string };

  if (!response.ok) {
    const errorMessage =
      "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "Could not load more comments.";

    throw new Error(errorMessage);
  }

  const page = payload as CursorPaginationResult<SerializedThreadComment>;

  return {
    items: page.items.map(deserializeThreadComment),
    nextCursor: page.nextCursor,
    endCursor: page.endCursor,
    hasMore: page.hasMore,
  } satisfies CursorPaginationResult<ThreadComment>;
}

export function InfiniteThreadComments({
  clubId,
  threadId,
  basePath,
  currentUserId,
  posts,
  initialRestoreAfter = null,
  initialFocusPostId = null,
}: InfiniteThreadCommentsProps) {
  const {
    items,
    hasMore,
    isLoadingMore,
    errorMessage,
    sentinelRef,
    loadMore,
    currentRestoreAfter,
  } = useInfiniteCursorFeed({
    initialPage: posts,
    initialRestoreAfter,
    initialFocusId: initialFocusPostId,
    fetchPage: (after) => fetchThreadPostsPage({ clubId, threadId, after }),
    hasFocusedItem: (threadComments, focusId) =>
      threadComments.some(
        (comment) =>
          comment.id === focusId
          || comment.replies.some((reply) => reply.id === focusId),
      ),
    getFocusElementId: (focusId) => `thread-post-${focusId}`,
  });

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-(--border) bg-(--surface) p-5 text-sm text-(--muted)">
        No comments yet.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-4 pt-1">
        {items.map((post) => (
          <ThreadPostCard
            key={post.id}
            clubId={clubId}
            threadId={threadId}
            post={post}
            replies={post.replies}
            returnTo={createDiscussionRestoreHref(basePath, {
              after: currentRestoreAfter,
              focusPostId: post.id,
            })}
            currentUserId={currentUserId}
          />
        ))}
      </div>

      {hasMore || errorMessage ? (
        <div className="space-y-3">
          <div ref={sentinelRef} aria-hidden className="h-px w-full" />
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-(--border) bg-(--surface) px-4 py-3 text-sm text-(--muted)">
            <div className="flex items-center gap-2">
              {isLoadingMore ? (
                <>
                  <LoaderCircle
                    aria-hidden
                    className="h-4 w-4 shrink-0 animate-spin"
                  />
                  <span>Loading more comments...</span>
                </>
              ) : errorMessage ? (
                <span className="text-[#8f2318]">{errorMessage}</span>
              ) : (
                <span>More comments are ready as you scroll.</span>
              )}
            </div>
            {hasMore ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={loadMore}
                disabled={isLoadingMore}
              >
                {errorMessage ? "Retry" : "Load more"}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

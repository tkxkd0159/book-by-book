"use client";

import { LoaderCircle } from "lucide-react";

import { ThreadCard } from "@/components/threads/thread-card";
import { useInfiniteCursorFeed } from "@/components/threads/use-infinite-cursor-feed";
import { Button } from "@/components/ui/button";
import { createDiscussionRestoreHref } from "@/lib/threads/presentation";
import { threadListQueryKey } from "@/lib/threads/query-keys";
import type {
  CursorPaginationResult,
  ThreadSummary,
} from "@/lib/threads/repository";
import {
  deserializeThreadSummary,
  type SerializedThreadSummary,
} from "@/lib/threads/serialization";

type ClubBookThreadListProps = {
  clubId: string;
  clubBookId: string;
  basePath: string;
  canManagePins: boolean;
  archived: boolean;
  queryCacheKey?: string | null;
  initialRestoreAfter?: string | null;
  initialFocusThreadId?: string | null;
};

async function fetchThreadsPage(input: {
  clubId: string;
  clubBookId: string;
  after: string | null;
  signal: AbortSignal;
}) {
  const searchParams = new URLSearchParams();
  if (input.after) {
    searchParams.set("after", input.after);
  }

  const response = await fetch(
    `/api/clubs/${encodeURIComponent(input.clubId)}/books/${encodeURIComponent(input.clubBookId)}/threads${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`,
    {
      cache: "no-store",
      credentials: "same-origin",
      signal: input.signal,
    },
  );

  const payload = await response.json() as
    | CursorPaginationResult<SerializedThreadSummary>
    | { error?: string };

  if (!response.ok) {
    const errorMessage =
      "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "Could not load more threads.";

    throw new Error(errorMessage);
  }

  const page = payload as CursorPaginationResult<SerializedThreadSummary>;

  return {
    items: page.items.map(deserializeThreadSummary),
    nextCursor: page.nextCursor,
    endCursor: page.endCursor,
    hasMore: page.hasMore,
  } satisfies CursorPaginationResult<ThreadSummary>;
}

export function ClubBookThreadList({
  clubId,
  clubBookId,
  basePath,
  canManagePins,
  archived,
  queryCacheKey = null,
  initialRestoreAfter = null,
  initialFocusThreadId = null,
}: ClubBookThreadListProps) {
  const {
    items,
    hasMore,
    isLoadingMore,
    errorMessage,
    sentinelRef,
    loadMore,
    currentRestoreAfter,
  } = useInfiniteCursorFeed({
    queryKey: threadListQueryKey({ clubId, clubBookId, cacheKey: queryCacheKey }),
    restoreStateKey: queryCacheKey,
    initialRestoreAfter,
    initialFocusId: initialFocusThreadId,
    fetchPage: (after, signal) =>
      fetchThreadsPage({ clubId, clubBookId, after, signal }),
    hasFocusedItem: (threadItems, focusId) =>
      threadItems.some((thread) => thread.id === focusId),
    getFocusElementId: (focusId) => `thread-${focusId}`,
  });

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-(--border) bg-(--surface) p-5 text-sm text-(--muted)">
        {archived
          ? "This book is archived and has no saved discussion threads."
          : "No threads yet. Start the first conversation for this club book."}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5">
        {items.map((thread) => (
          <ThreadCard
            key={thread.id}
            clubId={clubId}
            clubBookId={clubBookId}
            canManagePins={canManagePins}
            returnTo={createDiscussionRestoreHref(basePath, {
              after: currentRestoreAfter,
              focusThreadId: thread.id,
              hash: `thread-${thread.id}`,
            })}
            thread={thread}
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
                  <span>Loading more threads...</span>
                </>
              ) : errorMessage ? (
                <span className="text-[#8f2318]">{errorMessage}</span>
              ) : (
                <span>More threads are ready as you scroll.</span>
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

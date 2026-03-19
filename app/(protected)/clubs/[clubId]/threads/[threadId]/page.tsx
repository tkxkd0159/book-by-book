import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Trash2 } from "lucide-react";
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";

import { deleteThreadAction } from "@/app/(protected)/clubs/actions";
import { InfiniteThreadComments } from "@/components/threads/infinite-thread-comments";
import { PostComposer } from "@/components/threads/post-composer";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { FlashToast } from "@/components/ui/flash-toast";
import { makeQueryClient } from "@/lib/query/make-query-client";
import { seedInfiniteQueryPage } from "@/lib/query/seed-infinite-query";
import { loadThreadMemberRouteAccess } from "@/lib/threads/access";
import { canDeleteThreads } from "@/lib/threads/permissions";
import {
  CLUB_BOOK_STATUS_BADGE_VARIANTS,
  CLUB_BOOK_STATUS_LABELS,
} from "@/lib/clubs/presentation";
import { ThreadError } from "@/lib/threads/errors";
import { createDiscussionRestoreHref } from "@/lib/threads/presentation";
import {
  createThreadFeedCacheKey,
  threadCommentsQueryKey,
} from "@/lib/threads/query-keys";
import { findThreadDetailForMember } from "@/lib/threads/repository";

type ThreadDetailPageProps = {
  params: Promise<{ clubId: string; threadId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ThreadDetailData = {
  access: Extract<
    Awaited<ReturnType<typeof loadThreadMemberRouteAccess>>,
    { status: "ok" }
  >;
  detail: Awaited<ReturnType<typeof findThreadDetailForMember>>;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function loadThreadDetailData(input: {
  clubId: string;
  threadId: string;
}): Promise<ThreadDetailData | null> {
  const access = await loadThreadMemberRouteAccess(input.clubId);
  if (access.status === "unauthorized") {
    return null;
  }

  if (access.status === "not_found") {
    notFound();
  }

  if (access.status === "forbidden") {
    forbidden();
  }

  try {
    const detail = await findThreadDetailForMember({
      clubId: input.clubId,
      threadId: input.threadId,
      currentUserRole: access.club.currentUserRole,
    });

    return {
      access,
      detail,
    };
  } catch (caughtError) {
    if (
      caughtError instanceof ThreadError &&
      caughtError.code === "NOT_FOUND"
    ) {
      notFound();
    }

    throw caughtError;
  }
}

export default async function ThreadDetailPage({
  params,
  searchParams,
}: ThreadDetailPageProps) {
  const [{ clubId, threadId }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const message = readMessage(query.message);
  const error = readMessage(query.error);
  const restoreAfter = readMessage(query.after);
  const focusPostId = readMessage(query.focusPostId);
  const threadCommentsCacheKey = createThreadFeedCacheKey({
    message,
    error,
    after: restoreAfter,
    focusId: focusPostId,
  });
  const loaded = await loadThreadDetailData({
    clubId,
    threadId,
  });
  if (!loaded) {
    return null;
  }

  const { access, detail } = loaded;
  const queryClient = makeQueryClient();
  seedInfiniteQueryPage(
    queryClient,
    threadCommentsQueryKey({
      clubId,
      threadId,
      cacheKey: threadCommentsCacheKey,
    }),
    detail.posts,
  );
  const { thread } = detail;
  const basePath = `/clubs/${clubId}/threads/${threadId}`;
  const composerAnchorId = "thread-post-composer";
  const canDeleteThread = canDeleteThreads(detail.currentUserRole);

  return (
    <div className="space-y-6">
      <FlashToast
        key={`${message ?? ""}:${error ?? ""}`}
        message={message}
        error={error}
      />

      <section className="rounded-2xl border border-(--border) bg-(--surface-strong) p-6 shadow-[0_12px_30px_rgba(42,32,18,0.06)]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={CLUB_BOOK_STATUS_BADGE_VARIANTS[thread.clubBook.status]}
            >
              {CLUB_BOOK_STATUS_LABELS[thread.clubBook.status]}
            </Badge>
            {thread.isPinned ? <Badge variant="accent">Pinned</Badge> : null}
            {thread.clubBook.removedAt ? (
              <Badge variant="destructive">Archived book</Badge>
            ) : null}
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold leading-tight">
              {thread.title}
            </h1>
            {thread.body ? (
              <p className="max-w-3xl whitespace-pre-wrap text-(--muted)">
                {thread.body}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-(--muted)">
            <span>{thread.author.name ?? "Unknown reader"}</span>
            <span>Started {formatDate(thread.createdAt)}</span>
            <span>
              {thread.postCount} comment{thread.postCount === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/clubs/${clubId}/books/${thread.clubBook.id}`}
              className={buttonStyles({ variant: "secondary" })}
            >
              <ArrowLeft aria-hidden className="h-4 w-4 shrink-0" />
              Back to discussion list
            </Link>
            <Link
              href={`/books/${encodeURIComponent(thread.clubBook.book.googleVolumeId)}`}
              className={buttonStyles({ variant: "secondary" })}
            >
              <BookOpen aria-hidden className="h-4 w-4 shrink-0" />
              Book details
            </Link>
            {canDeleteThread ? (
              <form action={deleteThreadAction}>
                <input type="hidden" name="clubId" value={clubId} />
                <input
                  type="hidden"
                  name="clubBookId"
                  value={thread.clubBook.id}
                />
                <input type="hidden" name="threadId" value={threadId} />
                <input type="hidden" name="returnTo" value={basePath} />
                <Button type="submit" variant="destructive">
                  <Trash2 aria-hidden className="h-4 w-4 shrink-0" />
                  Delete thread
                </Button>
              </form>
            ) : null}
          </div>
        </div>
      </section>

      <section className="space-y-5 pt-2">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Comments</h2>
          <p className="text-sm text-(--muted)">
            Start a new top-level comment or jump into an existing reply thread.
          </p>
        </div>

        <div
          id={composerAnchorId}
          className="scroll-mt-28 rounded-2xl border border-(--border) bg-(--surface-strong) p-4 shadow-[0_10px_22px_rgba(42,32,18,0.04)] sm:scroll-mt-32 sm:p-5"
        >
          <PostComposer
            clubId={clubId}
            threadId={threadId}
            returnTo={createDiscussionRestoreHref(basePath, {
              hash: composerAnchorId,
            })}
            placeholder="Add a comment."
            scrollRestoreTargetId={composerAnchorId}
          />
        </div>

        <HydrationBoundary state={dehydrate(queryClient)}>
          <InfiniteThreadComments
            clubId={clubId}
            threadId={threadId}
            basePath={basePath}
            currentUserId={access.currentUser.id}
            queryCacheKey={threadCommentsCacheKey}
            initialRestoreAfter={restoreAfter}
            initialFocusPostId={focusPostId}
          />
        </HydrationBoundary>
      </section>
    </div>
  );
}

function readMessage(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

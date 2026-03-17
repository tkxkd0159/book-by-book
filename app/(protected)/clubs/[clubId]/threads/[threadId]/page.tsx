import { ArrowLeft, BookOpen, Trash2 } from "lucide-react";
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";

import { deleteThreadAction } from "@/app/(protected)/clubs/actions";
import { InfiniteThreadComments } from "@/components/threads/infinite-thread-comments";
import { PostComposer } from "@/components/threads/post-composer";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/server";
import { isClubMember } from "@/lib/clubs/permissions";
import { findClubDetail } from "@/lib/clubs/repository";
import { canDeleteThreads } from "@/lib/threads/permissions";
import {
  CLUB_BOOK_STATUS_BADGE_VARIANTS,
  CLUB_BOOK_STATUS_LABELS,
} from "@/lib/clubs/presentation";
import { ThreadError } from "@/lib/threads/errors";
import { createDiscussionRestoreHref } from "@/lib/threads/presentation";
import { findThreadDetail } from "@/lib/threads/repository";

type ThreadDetailPageProps = {
  params: Promise<{ clubId: string; threadId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ThreadDetailData = Awaited<ReturnType<typeof findThreadDetail>>;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function loadThreadDetailData(input: {
  clubId: string;
  threadId: string;
  userId: string;
}): Promise<ThreadDetailData> {
  try {
    return await findThreadDetail({
      clubId: input.clubId,
      threadId: input.threadId,
      userId: input.userId,
    });
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
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return null;
  }

  const [{ clubId, threadId }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const message = readMessage(query.message);
  const error = readMessage(query.error);
  const restoreAfter = readMessage(query.after);
  const focusPostId = readMessage(query.focusPostId);
  const club = await findClubDetail(clubId, currentUser.id);

  if (!club) {
    notFound();
  }

  if (!isClubMember(club.currentUserRole)) {
    forbidden();
  }

  const detail = await loadThreadDetailData({
    clubId,
    threadId,
    userId: currentUser.id,
  });
  const { thread, posts } = detail;
  const basePath = `/clubs/${clubId}/threads/${threadId}`;
  const composerAnchorId = "thread-post-composer";
  const canDeleteThread = canDeleteThreads(detail.currentUserRole);

  return (
    <div className="space-y-6">
      {message ? (
        <p className="rounded-xl border border-[#b9d6cf] bg-[#eef9f5] px-4 py-3 text-sm text-[#125547]">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-[#d39e95] bg-[#fff2ef] px-4 py-3 text-sm text-[#7e1f14]">
          {error}
        </p>
      ) : null}

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

        <InfiniteThreadComments
          clubId={clubId}
          threadId={threadId}
          basePath={basePath}
          currentUserId={currentUser.id}
          posts={posts}
          initialRestoreAfter={restoreAfter}
          initialFocusPostId={focusPostId}
        />
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

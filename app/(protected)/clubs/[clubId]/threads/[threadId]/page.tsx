import { ArrowLeft, ArrowRight, BookOpen, Trash2 } from "lucide-react";
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";

import { deleteThreadAction } from "@/app/(protected)/clubs/actions";
import { PostComposer } from "@/components/threads/post-composer";
import { ThreadPostCard } from "@/components/threads/thread-post-card";
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
import { createDiscussionPageHref } from "@/lib/threads/presentation";
import { findThreadDetail } from "@/lib/threads/repository";

type ThreadDetailPageProps = {
  params: Promise<{ clubId: string; threadId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ThreadDetailData = Awaited<ReturnType<typeof findThreadDetail>>;

function readPage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

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
  page: number;
}): Promise<ThreadDetailData> {
  try {
    return await findThreadDetail({
      clubId: input.clubId,
      threadId: input.threadId,
      userId: input.userId,
      page: input.page,
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
  const page = readPage(query.page);
  const message = readMessage(query.message);
  const error = readMessage(query.error);
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
    page,
  });
  const { thread, posts } = detail;
  const basePath = `/clubs/${clubId}/threads/${threadId}`;
  const currentPath = createDiscussionPageHref(basePath, page);
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
                <input type="hidden" name="returnTo" value={currentPath} />
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

        <div className="rounded-2xl border border-(--border) bg-(--surface-strong) p-4 shadow-[0_10px_22px_rgba(42,32,18,0.04)] sm:p-5">
          <PostComposer
            clubId={clubId}
            threadId={threadId}
            returnTo={currentPath}
            placeholder="Add a comment."
          />
        </div>

        {posts.items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-(--border) bg-(--surface) p-5 text-sm text-(--muted)">
            No comments yet.
          </p>
        ) : (
          <div className="space-y-4 pt-1">
            {posts.items.map((post) => (
              <ThreadPostCard
                key={post.id}
                clubId={clubId}
                threadId={threadId}
                post={post}
                replies={post.replies}
                returnTo={currentPath}
                currentUserId={currentUser.id}
              />
            ))}
          </div>
        )}

        {posts.hasPreviousPage || posts.hasNextPage ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-(--border) bg-(--surface) px-4 py-3 text-sm text-(--muted)">
            <span>
              Page {posts.page} of {posts.totalPages}
            </span>
            <div className="flex gap-2">
              {posts.hasPreviousPage ? (
                <Link
                  href={createDiscussionPageHref(basePath, posts.page - 1)}
                  className={buttonStyles({ variant: "secondary", size: "sm" })}
                >
                  <ArrowLeft aria-hidden className="h-4 w-4 shrink-0" />
                  Previous
                </Link>
              ) : null}
              {posts.hasNextPage ? (
                <Link
                  href={createDiscussionPageHref(basePath, posts.page + 1)}
                  className={buttonStyles({ variant: "secondary", size: "sm" })}
                >
                  Next
                  <ArrowRight aria-hidden className="h-4 w-4 shrink-0" />
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
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

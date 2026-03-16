import Link from "next/link";
import { notFound } from "next/navigation";

import { PostActions } from "@/components/threads/post-actions";
import { PinThreadButton } from "@/components/threads/pin-thread-button";
import { PostComposer } from "@/components/threads/post-composer";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/server";
import { isClubAdmin } from "@/lib/clubs/permissions";
import { CLUB_BOOK_STATUS_LABELS } from "@/lib/clubs/presentation";
import { ThreadError } from "@/lib/threads/errors";
import {
  createDiscussionPageHref,
  getThreadPostDisplayBody,
  hasThreadPostBeenEdited,
} from "@/lib/threads/presentation";
import { findThreadDetail } from "@/lib/threads/repository";

type ThreadDetailPageProps = {
  params: Promise<{ clubId: string; threadId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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

export default async function ThreadDetailPage({
  params,
  searchParams,
}: ThreadDetailPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return null;
  }

  const [{ clubId, threadId }, query] = await Promise.all([params, searchParams]);
  const page = readPage(query.page);
  const message = readMessage(query.message);
  const error = readMessage(query.error);

  try {
    const detail = await findThreadDetail({
      clubId,
      threadId,
      userId: currentUser.id,
      page,
    });

    const { thread, posts } = detail;
    const basePath = `/clubs/${clubId}/threads/${threadId}`;
    const currentPath = createDiscussionPageHref(basePath, page);
    const canManagePins = isClubAdmin(detail.currentUserRole);

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
              <Badge>{CLUB_BOOK_STATUS_LABELS[thread.clubBook.status]}</Badge>
              {thread.isPinned ? <Badge>Pinned</Badge> : null}
              {thread.clubBook.removedAt ? (
                <Badge className="bg-[#fff2ef] text-[#7e1f14]">
                  Archived book
                </Badge>
              ) : null}
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-semibold leading-tight">{thread.title}</h1>
              {thread.body ? (
                <p className="max-w-3xl whitespace-pre-wrap text-(--muted)">
                  {thread.body}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-(--muted)">
              <span>{thread.author.name ?? "Unknown reader"}</span>
              <span>Started {formatDate(thread.createdAt)}</span>
              <span>{thread.postCount} post{thread.postCount === 1 ? "" : "s"}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/clubs/${clubId}/books/${thread.clubBook.id}`}
                className={buttonStyles({ variant: "secondary" })}
              >
                Back to discussion list
              </Link>
              <Link
                href={`/books/${encodeURIComponent(thread.clubBook.book.googleVolumeId)}`}
                className={buttonStyles({ variant: "secondary" })}
              >
                Book details
              </Link>
              {canManagePins ? (
                <PinThreadButton
                  clubId={clubId}
                  clubBookId={thread.clubBook.id}
                  threadId={threadId}
                  isPinned={thread.isPinned}
                  returnTo={currentPath}
                />
              ) : null}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold">Posts</h2>
            <p className="text-sm text-(--muted)">Read the thread timeline here.</p>
          </div>

          <Card className="border-(--border)/90">
            <CardContent className="space-y-4 p-5">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Add a reply</h3>
                <p className="text-sm text-(--muted)">
                  Keep the discussion moving with questions, reactions, and notes.
                </p>
              </div>

              <PostComposer
                clubId={clubId}
                threadId={threadId}
                returnTo={currentPath}
              />
            </CardContent>
          </Card>

          {posts.items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-(--border) bg-(--surface) p-5 text-sm text-(--muted)">
              No posts yet.
            </p>
          ) : (
            <div className="grid gap-4">
              {posts.items.map((post) => (
                <Card key={post.id} className="border-(--border)/80 bg-(--surface)">
                  <CardContent className="space-y-3 p-5">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-(--muted)">
                      <span>{post.author.name ?? "Unknown reader"}</span>
                      <span>{formatDate(post.createdAt)}</span>
                      {hasThreadPostBeenEdited(post) ? <span>Edited</span> : null}
                      {post.deletedAt ? <span>Deleted</span> : null}
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                      {getThreadPostDisplayBody(post)}
                    </p>
                    {post.authorId === currentUser.id ? (
                      <PostActions
                        clubId={clubId}
                        threadId={threadId}
                        post={post}
                        returnTo={currentPath}
                      />
                    ) : null}
                  </CardContent>
                </Card>
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
                    Previous
                  </Link>
                ) : null}
                {posts.hasNextPage ? (
                  <Link
                    href={createDiscussionPageHref(basePath, posts.page + 1)}
                    className={buttonStyles({ variant: "secondary", size: "sm" })}
                  >
                    Next
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    );
  } catch (caughtError) {
    if (caughtError instanceof ThreadError && caughtError.code === "NOT_FOUND") {
      notFound();
    }

    throw caughtError;
  }
}

function readMessage(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

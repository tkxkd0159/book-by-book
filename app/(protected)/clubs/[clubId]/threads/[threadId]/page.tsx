import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/server";
import { CLUB_BOOK_STATUS_LABELS } from "@/lib/clubs/presentation";
import { ThreadError } from "@/lib/threads/errors";
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

function createPageHref(basePath: string, page: number) {
  if (page <= 1) {
    return basePath;
  }

  return `${basePath}?page=${page}`;
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

  try {
    const detail = await findThreadDetail({
      clubId,
      threadId,
      userId: currentUser.id,
      page,
    });

    const { thread, posts } = detail;
    const basePath = `/clubs/${clubId}/threads/${threadId}`;

    return (
      <div className="space-y-6">
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
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold">Posts</h2>
            <p className="text-sm text-(--muted)">Read the thread timeline here.</p>
          </div>

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
                      {post.deletedAt ? <span>Deleted</span> : null}
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                      {post.deletedAt ? "This post was deleted." : post.body}
                    </p>
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
                    href={createPageHref(basePath, posts.page - 1)}
                    className={buttonStyles({ variant: "secondary", size: "sm" })}
                  >
                    Previous
                  </Link>
                ) : null}
                {posts.hasNextPage ? (
                  <Link
                    href={createPageHref(basePath, posts.page + 1)}
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

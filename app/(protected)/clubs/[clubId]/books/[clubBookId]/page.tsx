import Image from "next/image";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";

import { ClubBookThreadList } from "@/components/threads/club-book-thread-list";
import { StartThreadModal } from "@/components/threads/start-thread-modal";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FlashToast } from "@/components/ui/flash-toast";
import { isClubAdmin } from "@/lib/clubs/permissions";
import { makeQueryClient } from "@/lib/query/make-query-client";
import { seedInfiniteQueryPage } from "@/lib/query/seed-infinite-query";
import { createClubEntryHref } from "@/lib/clubs/view-paths";
import {
  CLUB_BOOK_STATUS_BADGE_VARIANTS,
  CLUB_BOOK_STATUS_LABELS,
  CLUB_ROLE_BADGE_VARIANTS,
} from "@/lib/clubs/presentation";
import { loadThreadMemberRouteAccess } from "@/lib/threads/access";
import { ThreadError } from "@/lib/threads/errors";
import {
  loadDiscussionDataForMember,
} from "@/lib/threads/repository";
import {
  createThreadFeedCacheKey,
  threadListQueryKey,
} from "@/lib/threads/query-keys";

type ClubBookDiscussionPageProps = {
  params: Promise<{ clubId: string; clubBookId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ClubBookDiscussionData = {
  access: Extract<
    Awaited<ReturnType<typeof loadThreadMemberRouteAccess>>,
    { status: "ok" }
  >;
  discussion: Awaited<ReturnType<typeof loadDiscussionDataForMember>>["discussion"];
  threads: Awaited<ReturnType<typeof loadDiscussionDataForMember>>["threads"];
};

function readMessage(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(value);
}

async function loadClubBookDiscussionData(input: {
  clubId: string;
  clubBookId: string;
}): Promise<ClubBookDiscussionData | null> {
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
    const { discussion, threads } = await loadDiscussionDataForMember({
      clubId: input.clubId,
      clubBookId: input.clubBookId,
      currentUserRole: access.club.currentUserRole,
    });

    return {
      access,
      discussion,
      threads,
    };
  } catch (caughtError) {
    if (caughtError instanceof ThreadError && caughtError.code === "NOT_FOUND") {
      notFound();
    }

    throw caughtError;
  }
}

export default async function ClubBookDiscussionPage({
  params,
  searchParams,
}: ClubBookDiscussionPageProps) {
  const [{ clubId, clubBookId }, query] = await Promise.all([params, searchParams]);
  const message = readMessage(query.message);
  const error = readMessage(query.error);
  const restoreAfter = readMessage(query.after);
  const focusThreadId = readMessage(query.focusThreadId);
  const threadFeedCacheKey = createThreadFeedCacheKey({
    message,
    error,
    after: restoreAfter,
    focusId: focusThreadId,
  });
  const data = await loadClubBookDiscussionData({
    clubId,
    clubBookId,
  });
  if (!data) {
    return null;
  }

  const { access, discussion, threads } = data;
  const queryClient = makeQueryClient();
  seedInfiniteQueryPage(
    queryClient,
    threadListQueryKey({
      clubId,
      clubBookId,
      cacheKey: threadFeedCacheKey,
    }),
    threads,
  );
  const { clubBook } = discussion;
  const { club } = access;
  const archived = Boolean(clubBook.removedAt);
  const canManagePins = isClubAdmin(discussion.currentUserRole);

  return (
    <div className="space-y-6">
      <FlashToast
        key={`${message ?? ""}:${error ?? ""}`}
        message={message}
        error={error}
      />

      <section className="rounded-2xl border border-(--border) bg-(--surface-strong) p-6 shadow-[0_12px_30px_rgba(42,32,18,0.06)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-5">
            <div className="relative h-36 w-24 overflow-hidden rounded-xl border border-(--border) bg-white shadow-[0_8px_20px_rgba(42,32,18,0.08)]">
              {clubBook.book.thumbnailUrl ? (
                <Image
                  src={clubBook.book.thumbnailUrl}
                  alt={`${clubBook.book.title} cover`}
                  fill
                  sizes="96px"
                  className="object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-3 text-center text-xs text-(--muted)">
                  No cover
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={CLUB_BOOK_STATUS_BADGE_VARIANTS[clubBook.status]}
                >
                  {CLUB_BOOK_STATUS_LABELS[clubBook.status]}
                </Badge>
                <Badge
                  variant={CLUB_ROLE_BADGE_VARIANTS[discussion.currentUserRole]}
                >
                  {discussion.currentUserRole}
                </Badge>
                {archived ? (
                  <Badge variant="destructive">
                    Archived book
                  </Badge>
                ) : null}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-(--muted)">
                  {club.name}
                </p>
                <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                  {clubBook.book.title}
                </h1>
                <p className="text-(--muted)">
                  {clubBook.book.authors.length > 0
                    ? clubBook.book.authors.join(", ")
                    : "Unknown author"}
                </p>
                <p className="text-sm text-(--muted)">
                  Added to this club on {formatDate(clubBook.addedAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={createClubEntryHref(club.id)}
              className={buttonStyles({ variant: "secondary" })}
            >
              <ArrowLeft aria-hidden className="h-4 w-4 shrink-0" />
              Back to club
            </Link>
            <Link
              href={`/books/${encodeURIComponent(clubBook.book.googleVolumeId)}`}
              className={buttonStyles({ variant: "secondary" })}
            >
              <BookOpen aria-hidden className="h-4 w-4 shrink-0" />
              Book details
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-5 pt-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold">Discussion threads</h2>
            <p className="text-sm text-(--muted)">
              Start topic-based conversations for this book inside {club.name}.
            </p>
          </div>
          {!archived ? (
            <StartThreadModal
              clubId={clubId}
              clubBookId={clubBookId}
              clubName={club.name}
              bookTitle={clubBook.book.title}
            />
          ) : null}
        </div>

        {archived ? (
          <Card className="border-[#d7c7a4] bg-[#fff8ec]">
            <CardContent className="p-4 text-sm text-[#6d4d12]">
              This club book has been archived. Existing discussion stays
              readable, but new threads can no longer be created.
            </CardContent>
          </Card>
        ) : null}

        <HydrationBoundary state={dehydrate(queryClient)}>
          <ClubBookThreadList
            clubId={clubId}
            clubBookId={clubBookId}
            basePath={`/clubs/${clubId}/books/${clubBookId}`}
            canManagePins={canManagePins}
            archived={archived}
            queryCacheKey={threadFeedCacheKey}
            initialRestoreAfter={restoreAfter}
            initialFocusThreadId={focusThreadId}
          />
        </HydrationBoundary>
      </section>
    </div>
  );
}

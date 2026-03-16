import Image from "next/image";
import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";

import { ClubBookThreadList } from "@/components/threads/club-book-thread-list";
import { StartThreadModal } from "@/components/threads/start-thread-modal";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/server";
import { isClubAdmin, isClubMember } from "@/lib/clubs/permissions";
import {
  CLUB_BOOK_STATUS_BADGE_VARIANTS,
  CLUB_BOOK_STATUS_LABELS,
  CLUB_ROLE_BADGE_VARIANTS,
} from "@/lib/clubs/presentation";
import { findClubDetail } from "@/lib/clubs/repository";
import { ThreadError } from "@/lib/threads/errors";
import {
  findDiscussionClubBook,
  listThreadsForClubBook,
} from "@/lib/threads/repository";

type ClubBookDiscussionPageProps = {
  params: Promise<{ clubId: string; clubBookId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ClubBookDiscussionData = {
  discussion: Awaited<ReturnType<typeof findDiscussionClubBook>>;
  threads: Awaited<ReturnType<typeof listThreadsForClubBook>>;
};

function readMessage(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function readPage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(value);
}

async function loadClubBookDiscussionData(input: {
  clubId: string;
  clubBookId: string;
  userId: string;
  page: number;
}): Promise<ClubBookDiscussionData> {
  try {
    const [discussion, threads] = await Promise.all([
      findDiscussionClubBook({
        clubId: input.clubId,
        clubBookId: input.clubBookId,
        userId: input.userId,
      }),
      listThreadsForClubBook({
        clubId: input.clubId,
        clubBookId: input.clubBookId,
        userId: input.userId,
        page: input.page,
      }),
    ]);

    return {
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
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return null;
  }

  const [{ clubId, clubBookId }, query] = await Promise.all([params, searchParams]);
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

  const { discussion, threads } = await loadClubBookDiscussionData({
    clubId,
    clubBookId,
    userId: currentUser.id,
    page,
  });
  const { clubBook } = discussion;
  const archived = Boolean(clubBook.removedAt);
  const canManagePins = isClubAdmin(discussion.currentUserRole);

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
              href={`/clubs/${club.id}`}
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

        <ClubBookThreadList
          clubId={clubId}
          clubBookId={clubBookId}
          basePath={`/clubs/${clubId}/books/${clubBookId}`}
          canManagePins={canManagePins}
          threads={threads}
          archived={archived}
        />
      </section>
    </div>
  );
}

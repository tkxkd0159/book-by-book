import Image from "next/image";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddBookModal } from "@/components/books/add-book-modal";
import { BookReviewPanel } from "@/components/reviews/book-review-panel";
import { PublicReviewList } from "@/components/reviews/public-review-list";
import { ReviewRating } from "@/components/reviews/review-rating";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/auth/server";
import { createSignedBookImportToken } from "@/lib/books/import-token";
import { listManageableClubBookTargetsForGoogleVolumeId } from "@/lib/clubs/repository";
import { formatReviewCount } from "@/lib/reviews/presentation";
import {
  findReviewByUserAndBook,
  getBookReviewAggregate,
  listRecentBookReviews,
} from "@/lib/reviews/repository";
import { createMyReviewHref } from "@/lib/reviews/view-paths";
import { resolveBookDetailWithRecord } from "@/lib/books/volume-details";
import { listManageableShelfBookTargetsForGoogleVolumeId } from "@/lib/shelves/repository";

type BookDetailPageProps = {
  params: Promise<{ googleVolumeId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function fallbackText(value: string | null | undefined, fallback = "N/A") {
  return value && value.trim().length > 0 ? value : fallback;
}

function readMessage(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function BookDetailPage({
  params,
  searchParams,
}: BookDetailPageProps) {
  const [{ googleVolumeId }, query] = await Promise.all([params, searchParams]);
  const currentUser = await requireCurrentUser();
  const resolvedBook = await resolveBookDetailWithRecord(googleVolumeId);

  if (!resolvedBook) {
    notFound();
  }

  const { book, persistedBook } = resolvedBook;
  const [
    clubTargets,
    shelfTargets,
    currentUserReview,
    reviewAggregate,
    recentReviews,
  ] = await Promise.all([
    listManageableClubBookTargetsForGoogleVolumeId(
      currentUser.id,
      googleVolumeId,
    ),
    listManageableShelfBookTargetsForGoogleVolumeId(
      currentUser.id,
      googleVolumeId,
    ),
    persistedBook
      ? findReviewByUserAndBook({
          userId: currentUser.id,
          bookId: persistedBook.id,
        })
      : Promise.resolve(null),
    persistedBook
      ? getBookReviewAggregate(persistedBook.id)
      : Promise.resolve({
          averageRating: null,
          reviewCount: 0,
        }),
    persistedBook
      ? listRecentBookReviews({
          bookId: persistedBook.id,
          limit: 5,
        })
      : Promise.resolve([]),
  ]);
  const message = readMessage(query.message);
  const error = readMessage(query.error);

  const description = book.description;
  const otherPublicReviews = recentReviews.filter(
    (entry) => entry.author.id !== currentUser.id,
  );
  const visibleRecentReviews =
    otherPublicReviews.length > 0 ? otherPublicReviews : recentReviews;

  return (
    <article className="space-y-6">
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

      <Card className="relative overflow-hidden border-2 border-(--border) bg-(--surface-strong)">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-(--accent)/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-4 h-56 w-56 rounded-full bg-[#c78d42]/10 blur-3xl" />

        <CardContent className="relative grid gap-6 p-6 lg:grid-cols-[220px_1fr] lg:p-8">
          <div className="mx-auto w-full max-w-55">
            <div className="relative aspect-2/3 w-full overflow-hidden rounded-xl border border-(--border) bg-white p-2 shadow-[0_8px_20px_rgba(42,32,18,0.12)]">
              {book.thumbnailUrl ? (
                <Image
                  src={book.thumbnailUrl}
                  alt={`${book.title} cover`}
                  fill
                  sizes="(max-width: 1024px) 220px, 220px"
                  className="object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-4 text-center text-sm text-(--muted)">
                  Cover image unavailable
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <header className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{book.googleVolumeId}</Badge>
              </div>
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                {book.title}
              </h1>
              {book.subtitle ? (
                <p className="text-lg text-(--muted)">{book.subtitle}</p>
              ) : null}
              <p className="text-(--muted)">
                {book.authors.length > 0
                  ? book.authors.join(", ")
                  : "Unknown author"}
              </p>
            </header>

            <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-(--border)/70 bg-(--surface)/70 p-3">
                <p className="text-xs uppercase tracking-wide text-(--muted)">
                  Publisher
                </p>
                <p className="mt-1 font-medium">
                  {fallbackText(book.publisher, "Unknown")}
                </p>
              </div>
              <div className="rounded-lg border border-(--border)/70 bg-(--surface)/70 p-3">
                <p className="text-xs uppercase tracking-wide text-(--muted)">
                  Published
                </p>
                <p className="mt-1 font-medium">
                  {fallbackText(book.publishedDate, "Unknown")}
                </p>
              </div>
              <div className="rounded-lg border border-(--border)/70 bg-(--surface)/70 p-3">
                <p className="text-xs uppercase tracking-wide text-(--muted)">
                  Language
                </p>
                <p className="mt-1 font-medium">
                  {fallbackText(book.language?.toUpperCase(), "Unknown")}
                </p>
              </div>
              <div className="rounded-lg border border-(--border)/70 bg-(--surface)/70 p-3">
                <p className="text-xs uppercase tracking-wide text-(--muted)">
                  Pages
                </p>
                <p className="mt-1 font-medium">
                  {book.pageCount ?? "Unknown"}
                </p>
              </div>
              <div className="rounded-lg border border-(--border)/70 bg-(--surface)/70 p-3 sm:col-span-2 xl:col-span-2">
                <p className="text-xs uppercase tracking-wide text-(--muted)">
                  ISBN
                </p>
                <p className="mt-1 font-medium">
                  {book.isbn13 ?? book.isbn10 ?? "Unavailable"}
                </p>
              </div>
            </div>

            {book.categories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {book.categories.map((category) => (
                  <Badge key={category} className="bg-(--surface)/80">
                    {category}
                  </Badge>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Link
                href="/books/search"
                className={buttonStyles({ variant: "secondary" })}
              >
                <ArrowLeft aria-hidden className="h-4 w-4 shrink-0" />
                Back to search
              </Link>
              <AddBookModal
                googleVolumeId={book.googleVolumeId}
                bookTitle={book.title}
                clubTargets={clubTargets}
                shelfTargets={shelfTargets}
                returnTo={`/books/${encodeURIComponent(book.googleVolumeId)}`}
                bookImportToken={createSignedBookImportToken(book)}
                triggerSize="md"
              />
              {book.infoLink ? (
                <a
                  href={book.infoLink}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonStyles({ variant: "secondary" })}
                >
                  <ExternalLink aria-hidden className="h-4 w-4 shrink-0" />
                  View on Google Books
                </a>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-(--border)/90">
        <CardContent className="space-y-5 p-7 sm:p-8">
          <h2 className="text-xl font-semibold">About this book</h2>
          {description ? (
            <div
              className="text-[15px] leading-7 text-(--muted) [&_p]:mb-4 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_em]:italic [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          ) : (
            <p className="text-sm text-(--muted)">
              No description available for this title.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-(--border)/90">
        <CardContent className="space-y-6 p-7 sm:p-8">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Reader reviews</h2>
            <p className="text-sm text-(--muted)">
              Ratings and public thoughts from signed-in Book by Book members.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
            <div className="space-y-3 rounded-xl border border-(--border) bg-(--surface) p-5">
              <p className="text-sm font-medium text-(--muted)">
                Average rating
              </p>
              <ReviewRating
                value={reviewAggregate.averageRating}
                reviewCount={reviewAggregate.reviewCount}
              />
              <p className="text-sm text-(--muted)">
                {reviewAggregate.reviewCount > 0
                  ? formatReviewCount(reviewAggregate.reviewCount)
                  : "Be the first to review this book."}
              </p>
            </div>

            <div
              id="review-editor"
              className="scroll-mt-24 rounded-xl border border-(--border) bg-(--surface) p-5"
            >
              <BookReviewPanel
                key={[
                  book.googleVolumeId,
                  currentUserReview?.id ?? "new",
                  currentUserReview?.updatedAt.toISOString() ?? "fresh",
                  error ? "error" : "clean",
                ].join(":")}
                googleVolumeId={book.googleVolumeId}
                review={currentUserReview}
                returnTo={createMyReviewHref(book.googleVolumeId)}
                bookImportToken={createSignedBookImportToken(book)}
                initialMode={currentUserReview && !error ? "view" : "edit"}
              />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Recent public reviews</h3>
            <PublicReviewList
              reviews={visibleRecentReviews}
              emptyMessage="No public reviews yet."
            />
          </div>
        </CardContent>
      </Card>
    </article>
  );
}

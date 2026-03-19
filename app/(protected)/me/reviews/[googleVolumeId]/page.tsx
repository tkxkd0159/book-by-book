import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ReviewForm } from "@/components/reviews/review-form";
import { buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/auth/server";
import { createSignedBookImportToken } from "@/lib/books/import-token";
import { resolveBookDetailWithRecord } from "@/lib/books/volume-details";
import { findReviewByUserAndBook } from "@/lib/reviews/repository";
import {
  createMyReviewedHref,
  createMyReviewHref,
} from "@/lib/reviews/view-paths";

type ReviewPageProps = {
  params: Promise<{ googleVolumeId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readMessage(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function MyReviewPage({
  params,
  searchParams,
}: ReviewPageProps) {
  const [currentUser, routeParams, query] = await Promise.all([
    requireCurrentUser(),
    params,
    searchParams,
  ]);
  const resolvedBook = await resolveBookDetailWithRecord(routeParams.googleVolumeId);

  if (!resolvedBook) {
    notFound();
  }

  const currentReview = resolvedBook.persistedBook
    ? await findReviewByUserAndBook({
        userId: currentUser.id,
        bookId: resolvedBook.persistedBook.id,
      })
    : null;
  const message = readMessage(query.message);
  const error = readMessage(query.error);
  const reviewPath = createMyReviewHref(resolvedBook.book.googleVolumeId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold sm:text-4xl">
            {currentReview ? "Edit your review" : "Write your review"}
          </h1>
          <p className="text-(--muted)">
            A rating is required. Written thoughts are optional.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/books/${encodeURIComponent(resolvedBook.book.googleVolumeId)}`}
            className={buttonStyles({ variant: "secondary" })}
          >
            Open book
          </Link>
          <Link
            href={createMyReviewedHref()}
            className={buttonStyles({ variant: "secondary" })}
          >
            Back to reviewed books
          </Link>
        </div>
      </div>

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

      <Card className="border-2 border-(--border) bg-(--surface-strong)">
        <CardContent className="grid gap-5 p-6 sm:grid-cols-[120px_1fr] sm:p-8">
          <div className="mx-auto w-full max-w-30">
            <div className="relative aspect-2/3 overflow-hidden rounded-xl border border-(--border) bg-white p-2 shadow-sm">
              {resolvedBook.book.thumbnailUrl ? (
                <Image
                  src={resolvedBook.book.thumbnailUrl}
                  alt={`${resolvedBook.book.title} cover`}
                  fill
                  sizes="120px"
                  className="object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-3 text-center text-xs text-(--muted)">
                  Cover unavailable
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold">{resolvedBook.book.title}</h2>
              {resolvedBook.book.subtitle ? (
                <p className="text-(--muted)">{resolvedBook.book.subtitle}</p>
              ) : null}
            </div>
            <p className="text-sm text-(--muted)">
              {resolvedBook.book.authors.length > 0
                ? resolvedBook.book.authors.join(", ")
                : "Unknown author"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-(--border)/90">
        <CardHeader>
          <CardTitle>
            {currentReview ? "Update your review" : "Publish your review"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReviewForm
            googleVolumeId={resolvedBook.book.googleVolumeId}
            review={currentReview}
            returnTo={reviewPath}
            cancelHref={`/books/${encodeURIComponent(resolvedBook.book.googleVolumeId)}`}
            bookImportToken={createSignedBookImportToken(resolvedBook.book)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

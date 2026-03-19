"use client";

import Image from "next/image";
import Link from "next/link";
import { PencilLine, Trash2, X } from "lucide-react";
import { useState } from "react";

import { deleteReviewAction } from "@/app/(protected)/me/reviews/actions";
import { ReviewForm } from "@/components/reviews/review-form";
import { ReviewRating } from "@/components/reviews/review-rating";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatReviewDate,
  getReviewBodyPreview,
  getReviewTitle,
} from "@/lib/reviews/presentation";
import type { ReviewedBookEntry } from "@/lib/reviews/repository";

type ReviewedBookCardProps = {
  entry: ReviewedBookEntry;
  initialMode?: "edit" | "view";
};

function createReviewedReturnTo(googleVolumeId: string, reviewId: string) {
  const url = new URL("/me/reviewed", "http://localhost");
  url.searchParams.set("focusReview", googleVolumeId);
  url.hash = `review-${reviewId}`;
  return `${url.pathname}${url.search}${url.hash}`;
}

export function ReviewedBookCard({
  entry,
  initialMode = "view",
}: ReviewedBookCardProps) {
  const [isEditing, setIsEditing] = useState(initialMode === "edit");
  const returnTo = createReviewedReturnTo(
    entry.book.googleVolumeId,
    entry.review.id,
  );

  return (
    <Card id={`review-${entry.review.id}`} className="border-(--border)/90">
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
          <div className="mx-auto w-full max-w-20 sm:mx-0 sm:w-16 sm:max-w-none">
            <div className="relative aspect-2/3 overflow-hidden rounded-xl border border-(--border) bg-white shadow-sm">
              {entry.book.thumbnailUrl ? (
                <Image
                  src={entry.book.thumbnailUrl}
                  alt={`${entry.book.title} cover`}
                  fill
                  sizes="64px"
                  className="object-contain p-1.5"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-3 text-center text-xs text-(--muted)">
                  No cover
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 rounded-full p-0"
                    aria-label="Cancel review edit"
                    onClick={() => setIsEditing(false)}
                  >
                    <X aria-hidden className="h-4 w-4 shrink-0" />
                  </Button>
                  <form action={deleteReviewAction}>
                    <input
                      type="hidden"
                      name="googleVolumeId"
                      value={entry.book.googleVolumeId}
                    />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 rounded-full p-0 text-[#8f2318] hover:bg-[#fff1ee] hover:text-[#741a13]"
                      aria-label="Delete review"
                    >
                      <Trash2 aria-hidden className="h-4 w-4 shrink-0" />
                    </Button>
                  </form>
                </div>

                <div className="space-y-1">
                  <Link
                    href={`/books/${encodeURIComponent(entry.book.googleVolumeId)}`}
                    className="text-lg font-semibold text-foreground underline-offset-4 hover:underline"
                  >
                    {entry.book.title}
                  </Link>
                  {entry.book.subtitle ? (
                    <p className="text-sm text-(--muted)">{entry.book.subtitle}</p>
                  ) : null}
                  <p className="text-sm text-(--muted)">
                    {entry.book.authors.length > 0
                      ? entry.book.authors.join(", ")
                      : "Unknown author"}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-(--muted)">
                    Edit your review
                  </p>
                  <p className="text-sm text-(--muted)">
                    Update the headline, rating, or body without leaving this list.
                  </p>
                </div>

                <ReviewForm
                  googleVolumeId={entry.book.googleVolumeId}
                  review={entry.review}
                  returnTo={returnTo}
                  onCancel={() => setIsEditing(false)}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 rounded-full p-0"
                    aria-label="Edit review"
                    onClick={() => setIsEditing(true)}
                  >
                    <PencilLine aria-hidden className="h-4 w-4 shrink-0" />
                  </Button>
                  <form action={deleteReviewAction}>
                    <input
                      type="hidden"
                      name="googleVolumeId"
                      value={entry.book.googleVolumeId}
                    />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 rounded-full p-0 text-[#8f2318] hover:bg-[#fff1ee] hover:text-[#741a13]"
                      aria-label="Delete review"
                    >
                      <Trash2 aria-hidden className="h-4 w-4 shrink-0" />
                    </Button>
                  </form>
                </div>

                <div className="space-y-1">
                  <Link
                    href={`/books/${encodeURIComponent(entry.book.googleVolumeId)}`}
                    className="text-lg font-semibold text-foreground underline-offset-4 hover:underline"
                  >
                    {entry.book.title}
                  </Link>
                  {entry.book.subtitle ? (
                    <p className="text-sm text-(--muted)">{entry.book.subtitle}</p>
                  ) : null}
                  <p className="text-sm text-(--muted)">
                    {entry.book.authors.length > 0
                      ? entry.book.authors.join(", ")
                      : "Unknown author"}
                  </p>
                </div>

                <div className="space-y-3 border-t border-(--border)/70 pt-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <ReviewRating value={entry.review.rating} size="sm" />
                    <h2 className="text-base font-semibold text-foreground">
                      {getReviewTitle(entry.review.title, entry.review.rating)}
                    </h2>
                  </div>
                  <p className="text-sm text-(--muted)">
                    Reviewed on {formatReviewDate(entry.review.createdAt)}
                  </p>
                  <p className="whitespace-pre-line text-sm leading-6 text-(--muted)">
                    {getReviewBodyPreview(entry.review.body)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

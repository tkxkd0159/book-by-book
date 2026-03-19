import Link from "next/link";

import { ReviewRating } from "@/components/reviews/review-rating";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getReviewBodyPreview } from "@/lib/reviews/presentation";
import { createMyReviewHref } from "@/lib/reviews/view-paths";
import type { ReviewedBookEntry } from "@/lib/reviews/repository";

type ReviewedBookCardProps = {
  entry: ReviewedBookEntry;
};

export function ReviewedBookCard({ entry }: ReviewedBookCardProps) {
  return (
    <Card className="border-(--border)/90">
      <CardContent className="space-y-4 p-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/books/${encodeURIComponent(entry.book.googleVolumeId)}`}
              className="text-lg font-semibold text-foreground underline-offset-4 hover:underline"
            >
              {entry.book.title}
            </Link>
            {entry.book.subtitle ? (
              <span className="text-sm text-(--muted)">{entry.book.subtitle}</span>
            ) : null}
          </div>
          <p className="text-sm text-(--muted)">
            {entry.book.authors.length > 0
              ? entry.book.authors.join(", ")
              : "Unknown author"}
          </p>
        </div>

        <ReviewRating value={entry.review.rating} />

        <p className="text-sm leading-6 text-(--muted)">
          {getReviewBodyPreview(entry.review.body)}
        </p>

        <div className="flex flex-wrap gap-2">
          <Link
            href={createMyReviewHref(entry.book.googleVolumeId)}
            className={buttonStyles({ size: "sm" })}
          >
            Edit review
          </Link>
          <Link
            href={`/books/${encodeURIComponent(entry.book.googleVolumeId)}`}
            className={buttonStyles({ variant: "secondary", size: "sm" })}
          >
            Open book
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

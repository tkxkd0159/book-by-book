"use client";

import { PencilLine, Trash2 } from "lucide-react";
import { useState } from "react";

import { deleteReviewAction } from "@/app/(protected)/me/reviews/actions";
import { ReviewForm } from "@/components/reviews/review-form";
import { ReviewRating } from "@/components/reviews/review-rating";
import { Button } from "@/components/ui/button";
import {
  formatReviewDate,
  getReviewBodyPreview,
  getReviewTitle,
} from "@/lib/reviews/presentation";
import type { ReviewRecord } from "@/types/db";

type BookReviewPanelProps = {
  googleVolumeId: string;
  review: ReviewRecord | null;
  returnTo: string;
  bookImportToken?: string;
  initialMode?: "edit" | "view";
};

export function BookReviewPanel({
  googleVolumeId,
  review,
  returnTo,
  bookImportToken,
  initialMode = "view",
}: BookReviewPanelProps) {
  const [isEditing, setIsEditing] = useState(
    review ? initialMode === "edit" : true,
  );

  if (!review || isEditing) {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-(--muted)">
            {review ? "Edit your review" : "Write your review"}
          </p>
          <p className="text-sm text-(--muted)">
            {review
              ? "Refine the headline, rating, or notes, then save to return to the compact view."
              : "Pick a rating, add a short headline, and write optional thoughts without leaving this page."}
          </p>
        </div>

        <ReviewForm
          googleVolumeId={googleVolumeId}
          review={review}
          returnTo={returnTo}
          bookImportToken={bookImportToken}
          onCancel={review ? () => setIsEditing(false) : undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-(--muted)">
            Your review
          </p>
          <p className="text-sm text-(--muted)">
            Posted on {formatReviewDate(review.createdAt)}
          </p>
        </div>

        <div className="flex items-center gap-1">
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
            <input type="hidden" name="googleVolumeId" value={googleVolumeId} />
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
      </div>

      <div className="space-y-3 border-t border-(--border)/70 pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <ReviewRating value={review.rating} size="sm" />
          <span className="text-sm font-medium text-foreground">
            {getReviewTitle(review.title, review.rating)}
          </span>
        </div>
        <p className="whitespace-pre-line text-sm leading-6 text-(--muted)">
          {getReviewBodyPreview(review.body)}
        </p>
      </div>
    </div>
  );
}

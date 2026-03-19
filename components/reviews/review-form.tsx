"use client";

import { useId, useState } from "react";

import { upsertReviewAction } from "@/app/(protected)/me/reviews/actions";
import { RatingStars } from "@/components/reviews/rating-stars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  REVIEW_RATING_OPTIONS,
  formatReviewRatingLabel,
  formatReviewRatingValue,
} from "@/lib/reviews/rating";
import type { ReviewRecord, ReviewRating } from "@/types/db";

type ReviewFormProps = {
  googleVolumeId: string;
  review: ReviewRecord | null;
  returnTo: string;
  bookImportToken?: string;
  onCancel?: () => void;
};

export function ReviewForm({
  googleVolumeId,
  review,
  returnTo,
  bookImportToken,
  onCancel,
}: ReviewFormProps) {
  const [selectedRating, setSelectedRating] = useState<ReviewRating | null>(
    review?.rating ?? null,
  );
  const [hoveredRating, setHoveredRating] = useState<ReviewRating | null>(null);
  const idPrefix = useId();
  const previewRating = hoveredRating ?? selectedRating ?? 0;

  return (
    <div className="space-y-4">
      <form action={upsertReviewAction} className="space-y-5">
        <input type="hidden" name="googleVolumeId" value={googleVolumeId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        {bookImportToken ? (
          <input type="hidden" name="bookImportToken" value={bookImportToken} />
        ) : null}

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Rating</legend>
          <div className="space-y-3">
            <div
              className="space-y-3"
              onMouseLeave={() => setHoveredRating(null)}
            >
              <div
                role="radiogroup"
                aria-label="Rating"
                className="relative inline-flex rounded-lg p-1 focus-within:ring-2 focus-within:ring-(--accent-soft)"
              >
                <RatingStars value={previewRating} size="lg" />

                <div className="absolute inset-0 grid grid-cols-10 overflow-hidden rounded-lg">
                  {REVIEW_RATING_OPTIONS.map((rating, index) => (
                    <label
                      key={rating}
                      htmlFor={`${idPrefix}-${index}`}
                      className="relative block h-full w-full cursor-pointer"
                      onMouseEnter={() => setHoveredRating(rating)}
                    >
                      <input
                        id={`${idPrefix}-${index}`}
                        type="radio"
                        name="rating"
                        value={rating}
                        checked={selectedRating === rating}
                        onChange={() => setSelectedRating(rating)}
                        required={index === 0}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                      <span className="sr-only">
                        {formatReviewRatingLabel(rating)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-sm text-(--muted)">
              {selectedRating
                ? `${formatReviewRatingValue(selectedRating)} of 5 stars selected`
                : "Choose a rating from 0.5 to 5 stars."}
            </p>
          </div>
        </fieldset>

        <label className="block space-y-2 text-sm font-medium">
          <span>Title</span>
          <Input
            name="title"
            defaultValue={review?.title ?? ""}
            maxLength={120}
            placeholder="Sum up your take in one line."
          />
        </label>

        <label className="block space-y-2 text-sm font-medium">
          <span>Review</span>
          <Textarea
            name="body"
            defaultValue={review?.body ?? ""}
            maxLength={5000}
            placeholder="What stood out to you? This field is optional."
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <Button type="submit">
            {review ? "Save review" : "Publish review"}
          </Button>
          {onCancel ? (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

"use client";

import { Star } from "lucide-react";
import { useId, useState } from "react";

import {
  deleteReviewAction,
  upsertReviewAction,
} from "@/app/(protected)/me/reviews/actions";
import { Button, buttonStyles } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ReviewRecord, ReviewRating } from "@/types/db";

type ReviewFormProps = {
  googleVolumeId: string;
  review: ReviewRecord | null;
  returnTo: string;
  bookImportToken?: string;
};

const REVIEW_RATING_OPTIONS = [1, 2, 3, 4, 5] as const satisfies ReviewRating[];

export function ReviewForm({
  googleVolumeId,
  review,
  returnTo,
  bookImportToken,
}: ReviewFormProps) {
  const [selectedRating, setSelectedRating] = useState<ReviewRating | null>(
    review?.rating ?? null,
  );
  const idPrefix = useId();

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
              role="radiogroup"
              aria-label="Rating"
              className="flex flex-wrap items-center gap-1"
            >
            {REVIEW_RATING_OPTIONS.map((rating) => (
              <label
                key={rating}
                htmlFor={`${idPrefix}-${rating}`}
                className="group relative cursor-pointer rounded-full p-1 focus-within:outline-none focus-within:ring-2 focus-within:ring-(--accent-soft)"
              >
                <input
                  id={`${idPrefix}-${rating}`}
                  type="radio"
                  name="rating"
                  value={rating}
                  checked={selectedRating === rating}
                  onChange={() => setSelectedRating(rating)}
                  required={rating === 1}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                <Star
                  aria-hidden
                  className={cn(
                    "pointer-events-none h-8 w-8 transition-transform duration-150 group-hover:scale-105",
                    selectedRating !== null && rating <= selectedRating
                      ? "fill-[#c78d42] text-[#c78d42]"
                      : "text-(--border)",
                  )}
                />
                <span className="sr-only">
                  {rating} star{rating === 1 ? "" : "s"}
                </span>
              </label>
            ))}
            </div>
            <p className="text-sm text-(--muted)">
              {selectedRating
                ? `${selectedRating} of 5 stars selected`
                : "Choose a rating from 1 to 5."}
            </p>
          </div>
        </fieldset>

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
          {review ? (
            <button
              type="submit"
              formAction={deleteReviewAction}
              className={buttonStyles({ variant: "destructive" })}
            >
              Delete review
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

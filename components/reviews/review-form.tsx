import Link from "next/link";

import {
  deleteReviewAction,
  upsertReviewAction,
} from "@/app/(protected)/me/reviews/actions";
import { Button, buttonStyles } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ReviewRecord, ReviewRating } from "@/types/db";

type ReviewFormProps = {
  googleVolumeId: string;
  review: ReviewRecord | null;
  returnTo: string;
  bookImportToken?: string;
  cancelHref?: string;
};

const REVIEW_RATING_OPTIONS = [1, 2, 3, 4, 5] as const satisfies ReviewRating[];

export function ReviewForm({
  googleVolumeId,
  review,
  returnTo,
  bookImportToken,
  cancelHref,
}: ReviewFormProps) {
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
          <div className="flex flex-wrap gap-2">
            {REVIEW_RATING_OPTIONS.map((rating) => (
              <label
                key={rating}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-(--border) bg-(--surface) px-4 py-2 text-sm font-medium"
              >
                <input
                  type="radio"
                  name="rating"
                  value={rating}
                  defaultChecked={review?.rating === rating}
                  required={rating === 1}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                <span>{rating} star{rating === 1 ? "" : "s"}</span>
              </label>
            ))}
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
          {cancelHref ? (
            <Link
              href={cancelHref}
              className={buttonStyles({ variant: "secondary" })}
            >
              Cancel
            </Link>
          ) : null}
        </div>
      </form>

      {review ? (
        <form action={deleteReviewAction}>
          <input type="hidden" name="googleVolumeId" value={googleVolumeId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <Button type="submit" variant="destructive">
            Delete review
          </Button>
        </form>
      ) : null}
    </div>
  );
}

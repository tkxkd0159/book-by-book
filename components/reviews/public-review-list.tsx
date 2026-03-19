import { UserAvatar } from "@/components/auth/user-avatar";
import { ReviewRating } from "@/components/reviews/review-rating";
import {
  formatReviewAuthorId,
  formatReviewDate,
  getReviewAuthorName,
  getReviewBodyPreview,
  getReviewTitle,
} from "@/lib/reviews/presentation";
import type { PublicBookReview } from "@/lib/reviews/repository";

type PublicReviewListProps = {
  reviews: PublicBookReview[];
  emptyMessage: string;
};

export function PublicReviewList({
  reviews,
  emptyMessage,
}: PublicReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div
        data-testid="public-review-list"
        className="border-y border-(--border)/70 py-5 text-sm text-(--muted)"
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      data-testid="public-review-list"
      className="divide-y divide-(--border)/70 border-y border-(--border)/70"
    >
      {reviews.map((entry) => (
        <article
          key={entry.review.id}
          className="grid gap-4 py-5 sm:grid-cols-[auto_1fr]"
        >
          <div className="flex items-start gap-3">
            <UserAvatar
              name={entry.author.name}
              imageUrl={entry.author.imageUrl}
              alt={`${getReviewAuthorName(entry.author.name)} avatar`}
              className="h-11 w-11 border border-(--border) bg-(--surface-strong)"
              fallbackClassName="text-sm font-semibold text-foreground"
            />
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <ReviewRating value={entry.review.rating} size="sm" />
                <h4 className="text-base font-semibold text-foreground">
                  {getReviewTitle(entry.review.title, entry.review.rating)}
                </h4>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-(--muted)">
                <span className="font-medium text-foreground">
                  {getReviewAuthorName(entry.author.name)}
                </span>
                <span>{formatReviewAuthorId(entry.author.id)}</span>
                <span>{formatReviewDate(entry.review.createdAt)}</span>
              </div>
            </div>

            <p className="whitespace-pre-line text-[15px] leading-7 text-(--muted)">
              {getReviewBodyPreview(entry.review.body)}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

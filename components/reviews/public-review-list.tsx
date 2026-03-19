import { ReviewRating } from "@/components/reviews/review-rating";
import { Card, CardContent } from "@/components/ui/card";
import {
  getReviewAuthorName,
  getReviewBodyPreview,
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
      <Card className="border-(--border)/90">
        <CardContent className="p-5 pt-5 text-sm text-(--muted)">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((entry) => (
        <Card key={entry.review.id} className="border-(--border)/90">
          <CardContent className="space-y-3 p-5">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {getReviewAuthorName(entry.author.name)}
              </p>
              <ReviewRating value={entry.review.rating} size="sm" />
            </div>
            <p className="text-sm leading-6 text-(--muted)">
              {getReviewBodyPreview(entry.review.body)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

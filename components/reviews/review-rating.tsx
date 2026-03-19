import { RatingStars } from "@/components/reviews/rating-stars";
import { formatAverageRating } from "@/lib/reviews/presentation";

type ReviewRatingProps = {
  value: number | null;
  reviewCount?: number;
  size?: "sm" | "md";
  showValue?: boolean;
};

export function ReviewRating({
  value,
  reviewCount,
  size = "md",
  showValue = true,
}: ReviewRatingProps) {
  const normalizedValue = value === null ? 0 : Math.max(0, Math.min(5, value));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className="flex items-center"
        aria-label={
          value === null ? "No ratings yet" : `Rating ${formatAverageRating(value)}`
        }
      >
        <RatingStars value={normalizedValue} size={size} />
      </div>
      {showValue ? (
        <span className="text-sm font-medium text-foreground">
          {formatAverageRating(value)}
          {typeof reviewCount === "number" ? ` (${reviewCount})` : ""}
        </span>
      ) : null}
    </div>
  );
}

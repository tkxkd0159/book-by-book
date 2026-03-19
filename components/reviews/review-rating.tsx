import { Star } from "lucide-react";

import { formatAverageRating } from "@/lib/reviews/presentation";

type ReviewRatingProps = {
  value: number | null;
  reviewCount?: number;
  size?: "sm" | "md";
  showValue?: boolean;
};

const STAR_SIZE_CLASS_NAMES = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
} as const;

export function ReviewRating({
  value,
  reviewCount,
  size = "md",
  showValue = true,
}: ReviewRatingProps) {
  const roundedValue = value === null ? 0 : Math.max(0, Math.min(5, Math.round(value)));
  const starSizeClassName = STAR_SIZE_CLASS_NAMES[size];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className="flex items-center gap-1"
        aria-label={
          value === null ? "No ratings yet" : `Rating ${formatAverageRating(value)}`
        }
      >
        {Array.from({ length: 5 }, (_, index) => (
          <Star
            key={index}
            aria-hidden
            className={`${starSizeClassName} ${
              index < roundedValue
                ? "fill-[#c78d42] text-[#c78d42]"
                : "text-(--border)"
            }`}
          />
        ))}
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

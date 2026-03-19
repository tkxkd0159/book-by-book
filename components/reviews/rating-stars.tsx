import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

type RatingStarsProps = {
  value: number;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const STAR_SIZE_CLASS_NAMES = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-8 w-8",
} as const;

function getFillPercentage(value: number, index: number) {
  const offset = Math.max(0, Math.min(1, value - index));
  return `${offset * 100}%`;
}

export function RatingStars({
  value,
  size = "md",
  className,
}: RatingStarsProps) {
  const starSizeClassName = STAR_SIZE_CLASS_NAMES[size];
  const normalizedValue = Math.max(0, Math.min(5, value));

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="relative">
          <Star
            aria-hidden
            className={cn(starSizeClassName, "text-(--border)")}
          />
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{ width: getFillPercentage(normalizedValue, index) }}
          >
            <Star
              aria-hidden
              className={cn(
                starSizeClassName,
                "fill-[#c78d42] text-[#c78d42]",
              )}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

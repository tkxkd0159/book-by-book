import * as React from "react";

import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "neutral"
  | "accent"
  | "amber"
  | "success"
  | "info"
  | "destructive";

const badgeVariantStyles: Record<BadgeVariant, string> = {
  default: "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]",
  neutral: "border-[#cfd5de] bg-[#f3f5f8] text-[#4d5a6c]",
  accent: "border-[#d5b786] bg-[#fff2df] text-[#85551a]",
  amber: "border-[#e8cf97] bg-[#fff5df] text-[#875616]",
  success: "border-[#b9d6cf] bg-[#eef9f5] text-[#125547]",
  info: "border-[#bdd0f1] bg-[#eef5ff] text-[#1c4f8f]",
  destructive: "border-[#d39e95] bg-[#fff2ef] text-[#7e1f14]",
};

function Badge({
  variant = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        badgeVariantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
export type { BadgeVariant };

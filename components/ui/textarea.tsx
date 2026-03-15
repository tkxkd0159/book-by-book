import * as React from "react";

import { cn } from "@/lib/utils";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "min-h-28 w-full rounded-md border border-(--border) bg-(--surface-strong) px-3 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-(--accent) focus:ring-2 focus:ring-(--accent-soft)",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";

export { Textarea };

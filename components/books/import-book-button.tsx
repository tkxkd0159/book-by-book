"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@/components/ui/button";

type ImportBookButtonProps = {
  className?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
};

export function ImportBookButton({
  className,
  size = "sm",
  variant = "default",
}: ImportBookButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size={size}
      variant={variant}
      className={className}
      disabled={pending}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
          Importing...
        </span>
      ) : (
        "Import"
      )}
    </Button>
  );
}

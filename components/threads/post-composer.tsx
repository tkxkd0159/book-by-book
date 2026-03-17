"use client";

import { Send } from "lucide-react";

import { createThreadPostAction } from "@/app/(protected)/clubs/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type PostComposerProps = {
  clubId: string;
  threadId: string;
  returnTo: string;
  parentPostId?: string | null;
  textareaLabel?: string;
  placeholder?: string;
  submitLabel?: string;
  compact?: boolean;
  autoFocus?: boolean;
  onCancel?: () => void;
};

export function PostComposer({
  clubId,
  threadId,
  returnTo,
  parentPostId = null,
  textareaLabel = "Reply body",
  placeholder = "Add a comment.",
  submitLabel = "Post",
  compact = false,
  autoFocus = false,
  onCancel,
}: PostComposerProps) {
  return (
    <form action={createThreadPostAction} className={compact ? "space-y-2.5" : "space-y-3"}>
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="threadId" value={threadId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      {parentPostId ? (
        <input type="hidden" name="parentPostId" value={parentPostId} />
      ) : null}

      <Textarea
        name="body"
        aria-label={textareaLabel}
        placeholder={placeholder}
        maxLength={5000}
        required
        autoFocus={autoFocus}
        className={compact ? "min-h-20 bg-(--surface)" : "min-h-24 bg-(--surface)"}
      />

      <div className="flex flex-wrap items-center justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}

        <Button type="submit" size={compact ? "sm" : "md"}>
          <Send aria-hidden className="h-4 w-4 shrink-0" />
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

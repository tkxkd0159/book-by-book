"use client";

import { Send } from "lucide-react";
import { useEffect } from "react";

import { createThreadPostAction } from "@/app/(protected)/clubs/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const THREAD_SCROLL_RESTORE_STORAGE_KEY = "book-by-book:thread-post-scroll-restore";

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
  scrollRestoreTargetId?: string;
};

type ThreadScrollRestoreState = {
  pathname: string;
  targetId: string;
  targetTop: number;
};

function readThreadScrollRestoreState() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(
      THREAD_SCROLL_RESTORE_STORAGE_KEY,
    );
    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as Partial<ThreadScrollRestoreState>;
    if (
      typeof parsedValue.pathname !== "string"
      || typeof parsedValue.targetId !== "string"
      || typeof parsedValue.targetTop !== "number"
    ) {
      return null;
    }

    return parsedValue as ThreadScrollRestoreState;
  } catch {
    return null;
  }
}

function clearThreadScrollRestoreState() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(THREAD_SCROLL_RESTORE_STORAGE_KEY);
  } catch {
    // Ignore storage failures and fall back to default browser behavior.
  }
}

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
  scrollRestoreTargetId,
}: PostComposerProps) {
  useEffect(() => {
    if (!scrollRestoreTargetId || typeof window === "undefined") {
      return;
    }

    const restoreState = readThreadScrollRestoreState();
    if (
      !restoreState
      || restoreState.pathname !== window.location.pathname
      || restoreState.targetId !== scrollRestoreTargetId
    ) {
      return;
    }

    const target = document.getElementById(scrollRestoreTargetId);
    if (!target) {
      return;
    }

    window.requestAnimationFrame(() => {
      const nextTargetTop = target.getBoundingClientRect().top;
      const offsetDelta = nextTargetTop - restoreState.targetTop;

      if (Math.abs(offsetDelta) > 1) {
        window.scrollBy({ top: offsetDelta });
      }

      clearThreadScrollRestoreState();
    });
  }, [scrollRestoreTargetId]);

  function handleSubmitCapture() {
    if (!scrollRestoreTargetId || typeof window === "undefined") {
      return;
    }

    const target = document.getElementById(scrollRestoreTargetId);
    if (!target) {
      clearThreadScrollRestoreState();
      return;
    }

    try {
      window.sessionStorage.setItem(
        THREAD_SCROLL_RESTORE_STORAGE_KEY,
        JSON.stringify({
          pathname: window.location.pathname,
          targetId: scrollRestoreTargetId,
          targetTop: target.getBoundingClientRect().top,
        } satisfies ThreadScrollRestoreState),
      );
    } catch {
      clearThreadScrollRestoreState();
    }
  }

  return (
    <form
      action={createThreadPostAction}
      className={compact ? "space-y-2.5" : "space-y-3"}
      onSubmitCapture={handleSubmitCapture}
    >
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

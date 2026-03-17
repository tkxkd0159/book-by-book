"use client";

import { CircleMinus, CirclePlus, Pencil, Save, Trash2, X } from "lucide-react";
import { useId, useState, useSyncExternalStore } from "react";

import {
  deleteThreadPostAction,
  editThreadPostAction,
} from "@/app/(protected)/clubs/actions";
import { UserAvatar } from "@/components/auth/user-avatar";
import { PostComposer } from "@/components/threads/post-composer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getThreadPostDisplayBody,
  hasThreadPostBeenEdited,
} from "@/lib/threads/presentation";
import type { ThreadComment, ThreadPostWithAuthor } from "@/lib/threads/repository";
import { cn } from "@/lib/utils";

type ThreadPostCardProps = {
  clubId: string;
  threadId: string;
  post: ThreadComment | ThreadPostWithAuthor;
  returnTo: string;
  currentUserId: string;
  replies?: ThreadPostWithAuthor[];
  isReply?: boolean;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function withHash(pathname: string, hash: string) {
  const url = new URL(pathname, "http://localhost");
  url.hash = hash;
  return `${url.pathname}${url.search}${url.hash}`;
}

function formatReplyLabel(replyCount: number) {
  return `${replyCount} repl${replyCount === 1 ? "y" : "ies"}`;
}

const REPLY_VISIBILITY_STORAGE_EVENT = "thread-reply-visibility-change";

function subscribeToHashChange(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function getHashSnapshot() {
  return typeof window === "undefined" ? "" : window.location.hash;
}

function getReplyVisibilityStorageKey(threadId: string) {
  return `book-by-book:thread-replies:${threadId}`;
}

function readReplyVisibilitySnapshot(threadId: string, postId: string) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const rawValue = window.sessionStorage.getItem(
      getReplyVisibilityStorageKey(threadId),
    );
    if (!rawValue) {
      return false;
    }

    const parsedValue = JSON.parse(rawValue);
    if (
      !parsedValue
      || typeof parsedValue !== "object"
      || Array.isArray(parsedValue)
    ) {
      return false;
    }

    return parsedValue[postId] === true;
  } catch {
    return false;
  }
}

function subscribeToReplyVisibility(
  threadId: string,
  callback: () => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const storageKey = getReplyVisibilityStorageKey(threadId);

  function handleStorage(event: StorageEvent) {
    if (event.storageArea === window.sessionStorage && event.key === storageKey) {
      callback();
    }
  }

  function handleVisibilityChange(
    event: Event,
  ) {
    const detail = (event as CustomEvent<{ threadId?: string }>).detail;
    if (detail?.threadId === threadId) {
      callback();
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(
    REPLY_VISIBILITY_STORAGE_EVENT,
    handleVisibilityChange as EventListener,
  );

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(
      REPLY_VISIBILITY_STORAGE_EVENT,
      handleVisibilityChange as EventListener,
    );
  };
}

function writeReplyVisibilitySnapshot(
  threadId: string,
  postId: string,
  expanded: boolean,
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const storageKey = getReplyVisibilityStorageKey(threadId);
    const rawValue = window.sessionStorage.getItem(storageKey);
    const parsedValue =
      rawValue
      && (() => {
        try {
          const nextValue = JSON.parse(rawValue);
          return nextValue
            && typeof nextValue === "object"
            && !Array.isArray(nextValue)
            ? nextValue
            : {};
        } catch {
          return {};
        }
      })();
    const nextValue = {
      ...(parsedValue ?? {}),
      [postId]: expanded,
    };

    window.sessionStorage.setItem(storageKey, JSON.stringify(nextValue));
    window.dispatchEvent(
      new CustomEvent(REPLY_VISIBILITY_STORAGE_EVENT, {
        detail: { threadId },
      }),
    );
  } catch {
    // Ignore storage failures and fall back to the default folded behavior.
  }
}

export function ThreadPostCard({
  clubId,
  threadId,
  post,
  returnTo,
  currentUserId,
  replies = [],
  isReply = false,
}: ThreadPostCardProps) {
  const [editing, setEditing] = useState(false);
  const [replying, setReplying] = useState(false);
  const formId = useId();
  const postAnchorId = `thread-post-${post.id}`;
  const anchoredReturnTo = withHash(returnTo, postAnchorId);
  const replySectionId = `${postAnchorId}-replies`;
  const activeHash = useSyncExternalStore(
    subscribeToHashChange,
    getHashSnapshot,
    () => "",
  );
  const storedRepliesExpanded = useSyncExternalStore(
    (callback) => subscribeToReplyVisibility(threadId, callback),
    () => readReplyVisibilitySnapshot(threadId, post.id),
    () => false,
  );
  const authorName = post.author.name?.trim() || "Unknown reader";
  const isAuthor = post.authorId === currentUserId;
  const isEdited = hasThreadPostBeenEdited(post);
  const canReply = !isReply && !post.deletedAt;
  const replyCount = replies.length;
  const replyLabel = formatReplyLabel(replyCount);
  const hasAnchoredReply = !isReply
    && replyCount > 0
    && replies.some((reply) => `#thread-post-${reply.id}` === activeHash);
  const replySectionVisible = replying
    || storedRepliesExpanded
    || hasAnchoredReply;

  function toggleEditing() {
    const nextValue = !editing;
    if (nextValue) {
      setReplying(false);
    }

    setEditing(nextValue);
  }

  function toggleReplying() {
    const nextValue = !replying;
    if (nextValue) {
      setEditing(false);
      writeReplyVisibilitySnapshot(threadId, post.id, true);
    } else if (replyCount === 0) {
      writeReplyVisibilitySnapshot(threadId, post.id, false);
    }

    setReplying(nextValue);
  }

  function cancelReplying() {
    setReplying(false);
    if (replyCount === 0) {
      writeReplyVisibilitySnapshot(threadId, post.id, false);
    }
  }

  function toggleRepliesExpanded() {
    const nextValue = !replySectionVisible;
    if (!nextValue) {
      setReplying(false);
    }

    writeReplyVisibilitySnapshot(threadId, post.id, nextValue);
  }

  return (
    <article
      id={postAnchorId}
      className={cn(
        "scroll-mt-28 space-y-3 rounded-2xl border border-(--border)/80 bg-(--surface) px-4 py-4 shadow-[0_8px_18px_rgba(42,32,18,0.04)] sm:scroll-mt-32",
        isReply
          && "rounded-xl border-(--border)/65 bg-(--surface-strong) px-3 py-3 shadow-none",
      )}
    >
      <div className="flex items-start gap-3">
        {!post.deletedAt ? (
          <UserAvatar
            name={post.author.name}
            imageUrl={post.author.imageUrl}
            alt={`${authorName} avatar`}
            className={cn(
              "mt-0.5 shrink-0 border border-(--border) bg-(--surface-strong)",
              isReply ? "h-7 w-7" : "h-9 w-9",
            )}
            fallbackClassName="flex h-full w-full items-center justify-center bg-[#eadfc8] text-[11px] font-semibold text-[#5c4d38]"
          />
        ) : (
          <div className={cn("shrink-0", isReply ? "w-7" : "w-9")} />
        )}

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <p
              data-testid="thread-post-meta"
              className="flex flex-wrap items-center gap-2 text-xs text-(--muted) sm:text-sm"
            >
              {post.deletedAt ? (
                <span className="font-medium text-(--muted)">[deleted]</span>
              ) : (
                <span className="font-semibold text-foreground">{authorName}</span>
              )}
              <span aria-hidden>&bull;</span>
              <span>{formatDate(post.createdAt)}</span>
              {!post.deletedAt && isEdited ? (
                <>
                  <span aria-hidden>&bull;</span>
                  <span>edited</span>
                </>
              ) : null}
            </p>

            {!post.deletedAt && isAuthor ? (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Edit post"
                  aria-controls={formId}
                  aria-expanded={editing}
                  className="h-8 w-8 rounded-full px-0"
                  onClick={toggleEditing}
                >
                  <Pencil aria-hidden className="h-4 w-4 shrink-0" />
                  <span className="sr-only">Edit post</span>
                </Button>

                <form action={deleteThreadPostAction}>
                  <input type="hidden" name="clubId" value={clubId} />
                  <input type="hidden" name="threadId" value={threadId} />
                  <input type="hidden" name="postId" value={post.id} />
                  <input type="hidden" name="returnTo" value={anchoredReturnTo} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    aria-label="Delete post"
                    className="h-8 w-8 rounded-full px-0 text-[#8f2318] hover:bg-[#fff2ef] hover:text-[#741a13]"
                  >
                    <Trash2 aria-hidden className="h-4 w-4 shrink-0" />
                    <span className="sr-only">Delete post</span>
                  </Button>
                </form>
              </div>
            ) : null}
          </div>

          <p
            className={cn(
              "whitespace-pre-wrap text-sm leading-6 text-foreground",
              post.deletedAt && "italic text-(--muted)",
            )}
          >
            {getThreadPostDisplayBody(post)}
          </p>

          {editing ? (
            <form
              id={formId}
              action={editThreadPostAction}
              className="space-y-3 rounded-xl border border-(--border) bg-(--surface-strong) p-3"
            >
              <input type="hidden" name="clubId" value={clubId} />
              <input type="hidden" name="threadId" value={threadId} />
              <input type="hidden" name="postId" value={post.id} />
              <input type="hidden" name="returnTo" value={anchoredReturnTo} />

              <Textarea
                name="body"
                aria-label="Edit reply"
                defaultValue={post.body}
                maxLength={5000}
                required
                className="min-h-24 bg-(--surface)"
              />

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditing(false)}
                >
                  <X aria-hidden className="h-4 w-4 shrink-0" />
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  <Save aria-hidden className="h-4 w-4 shrink-0" />
                  Save
                </Button>
              </div>
            </form>
          ) : null}

          {!isReply && !editing ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-(--muted) sm:text-sm">
              {canReply ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Reply to ${authorName}`}
                  className="h-8 px-2.5"
                  onClick={toggleReplying}
                >
                  Reply
                </Button>
              ) : null}
              {replyCount > 0 ? (
                <>
                  <span className="font-medium">{replyLabel}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`${replySectionVisible ? "Hide" : "Show"} ${replyLabel}`}
                    aria-controls={replySectionId}
                    aria-expanded={replySectionVisible}
                    className="h-8 w-8 rounded-full px-0"
                    onClick={toggleRepliesExpanded}
                  >
                    {replySectionVisible ? (
                      <CircleMinus aria-hidden className="h-4 w-4 shrink-0" />
                    ) : (
                      <CirclePlus aria-hidden className="h-4 w-4 shrink-0" />
                    )}
                    <span className="sr-only">
                      {replySectionVisible ? "Hide" : "Show"} {replyLabel}
                    </span>
                  </Button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {!isReply && (replyCount > 0 || replying) ? (
        <div
          id={replySectionId}
          hidden={!replySectionVisible}
          className="ml-4 space-y-3 border-l border-(--border)/70 pl-4 sm:ml-6 sm:pl-5"
        >
          {replyCount > 0 ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--muted)">
              Replies
            </p>
          ) : null}

          {replies.map((reply) => (
            <ThreadPostCard
              key={reply.id}
              clubId={clubId}
              threadId={threadId}
              post={reply}
              replies={[]}
              returnTo={returnTo}
              currentUserId={currentUserId}
              isReply
            />
          ))}

          {replying ? (
            <div className="rounded-xl border border-(--border)/70 bg-(--surface) p-3">
              <PostComposer
                clubId={clubId}
                threadId={threadId}
                returnTo={returnTo}
                parentPostId={post.id}
                textareaLabel={`Reply to ${authorName}`}
                placeholder="Add a reply."
                compact
                autoFocus
                onCancel={cancelReplying}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

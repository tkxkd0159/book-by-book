"use client";

import { Pencil, Save, Trash2, X } from "lucide-react";
import { useId, useState } from "react";

import {
  deleteThreadPostAction,
  editThreadPostAction,
} from "@/app/(protected)/clubs/actions";
import { UserAvatar } from "@/components/auth/user-avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getThreadPostDisplayBody,
  hasThreadPostBeenEdited,
} from "@/lib/threads/presentation";
import type { ThreadPostWithAuthor } from "@/lib/threads/repository";

type ThreadPostCardProps = {
  clubId: string;
  threadId: string;
  post: ThreadPostWithAuthor;
  returnTo: string;
  currentUserId: string;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function ThreadPostCard({
  clubId,
  threadId,
  post,
  returnTo,
  currentUserId,
}: ThreadPostCardProps) {
  const [editing, setEditing] = useState(false);
  const formId = useId();
  const authorName = post.author.name?.trim() || "Unknown reader";
  const isAuthor = post.authorId === currentUserId;
  const isEdited = hasThreadPostBeenEdited(post);

  return (
    <article className="rounded-xl border border-(--border)/80 bg-(--surface) px-4 py-3 shadow-[0_6px_18px_rgba(42,32,18,0.05)]">
      {post.deletedAt ? (
        <div className="space-y-2">
          <p
            data-testid="thread-post-meta"
            className="flex flex-wrap items-center gap-2 text-sm text-(--muted)"
          >
            <span className="font-medium text-(--muted)">[deleted]</span>
            <span aria-hidden>&bull;</span>
            <span>{formatDate(post.createdAt)}</span>
          </p>
          <p className="text-sm italic text-(--muted)">
            {getThreadPostDisplayBody(post)}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
          <UserAvatar
            name={post.author.name}
            imageUrl={post.author.imageUrl}
            alt={`${authorName} avatar`}
            className="mt-0.5 h-8 w-8 border border-(--border) bg-(--surface-strong)"
            fallbackClassName="flex h-full w-full items-center justify-center bg-[#eadfc8] text-[11px] font-semibold text-[#5c4d38]"
          />

          <div className="min-w-0 space-y-2">
            <p
              data-testid="thread-post-meta"
              className="flex flex-wrap items-center gap-2 text-sm text-(--muted)"
            >
              <span className="font-semibold text-foreground">{authorName}</span>
              <span aria-hidden>&bull;</span>
              <span>{formatDate(post.createdAt)}</span>
              {isEdited ? (
                <>
                  <span aria-hidden>&bull;</span>
                  <span>edited</span>
                </>
              ) : null}
            </p>

            <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
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
                <input type="hidden" name="returnTo" value={returnTo} />

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
          </div>

          {isAuthor ? (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Edit post"
                aria-controls={formId}
                aria-expanded={editing}
                className="h-8 w-8 rounded-full px-0"
                onClick={() => setEditing((current) => !current)}
              >
                <Pencil aria-hidden className="h-4 w-4 shrink-0" />
                <span className="sr-only">Edit post</span>
              </Button>

              <form action={deleteThreadPostAction}>
                <input type="hidden" name="clubId" value={clubId} />
                <input type="hidden" name="threadId" value={threadId} />
                <input type="hidden" name="postId" value={post.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
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
      )}
    </article>
  );
}

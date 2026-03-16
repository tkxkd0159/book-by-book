import { deleteThreadPostAction, editThreadPostAction } from "@/app/(protected)/clubs/actions";
import type { ThreadPostWithAuthor } from "@/lib/threads/repository";

import { Button, buttonStyles } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type PostActionsProps = {
  clubId: string;
  threadId: string;
  post: ThreadPostWithAuthor;
  returnTo: string;
};

export function PostActions({
  clubId,
  threadId,
  post,
  returnTo,
}: PostActionsProps) {
  if (post.deletedAt) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <details className="rounded-lg border border-(--border) bg-(--surface) px-3 py-2">
        <summary className={buttonStyles({ variant: "secondary", size: "sm" })}>
          Edit post
        </summary>
        <form action={editThreadPostAction} className="mt-3 space-y-3">
          <input type="hidden" name="clubId" value={clubId} />
          <input type="hidden" name="threadId" value={threadId} />
          <input type="hidden" name="postId" value={post.id} />
          <input type="hidden" name="returnTo" value={returnTo} />

          <label className="block space-y-2 text-sm font-medium">
            <span>Edit your reply</span>
            <Textarea name="body" defaultValue={post.body} maxLength={5000} required />
          </label>

          <Button type="submit" size="sm">
            Update post
          </Button>
        </form>
      </details>

      <form action={deleteThreadPostAction}>
        <input type="hidden" name="clubId" value={clubId} />
        <input type="hidden" name="threadId" value={threadId} />
        <input type="hidden" name="postId" value={post.id} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <Button type="submit" variant="destructive" size="sm">
          Delete post
        </Button>
      </form>
    </div>
  );
}

import { Send } from "lucide-react";

import { createThreadPostAction } from "@/app/(protected)/clubs/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type PostComposerProps = {
  clubId: string;
  threadId: string;
  returnTo: string;
};

export function PostComposer({
  clubId,
  threadId,
  returnTo,
}: PostComposerProps) {
  return (
    <form action={createThreadPostAction} className="space-y-3">
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="threadId" value={threadId} />
      <input type="hidden" name="returnTo" value={returnTo} />

      <Textarea
        name="body"
        aria-label="Reply body"
        placeholder="Share your reply."
        maxLength={5000}
        required
        className="min-h-24 bg-(--surface)"
      />

      <Button type="submit">
        <Send aria-hidden className="h-4 w-4 shrink-0" />
        Post
      </Button>
    </form>
  );
}

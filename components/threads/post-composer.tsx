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
    <form action={createThreadPostAction} className="space-y-4">
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="threadId" value={threadId} />
      <input type="hidden" name="returnTo" value={returnTo} />

      <label className="block space-y-2 text-sm font-medium">
        <span>Write a reply</span>
        <Textarea
          name="body"
          placeholder="Add your thoughts to the thread."
          maxLength={5000}
          required
        />
      </label>

      <Button type="submit">Post reply</Button>
    </form>
  );
}

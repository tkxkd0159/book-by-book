import { createThreadAction } from "@/app/(protected)/clubs/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type CreateThreadFormProps = {
  clubId: string;
  clubBookId: string;
  archived: boolean;
};

export function CreateThreadForm({
  clubId,
  clubBookId,
  archived,
}: CreateThreadFormProps) {
  if (archived) {
    return (
      <div className="rounded-xl border border-[#d7c7a4] bg-[#fff8ec] p-4 text-sm text-[#6d4d12]">
        This club book has been archived. Existing discussion stays readable, but
        new threads can no longer be created.
      </div>
    );
  }

  return (
    <form action={createThreadAction} className="space-y-4">
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="clubBookId" value={clubBookId} />
      <input
        type="hidden"
        name="returnTo"
        value={`/clubs/${clubId}/books/${clubBookId}`}
      />

      <label className="block space-y-2 text-sm font-medium">
        <span>Thread title</span>
        <Input
          name="title"
          placeholder="Start the conversation"
          maxLength={160}
          required
        />
      </label>

      <label className="block space-y-2 text-sm font-medium">
        <span>Opening note</span>
        <Textarea
          name="body"
          placeholder="Share a prompt, reaction, or question for the club."
          maxLength={5000}
        />
      </label>

      <Button type="submit">Start thread</Button>
    </form>
  );
}

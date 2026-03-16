import { toggleThreadPinAction } from "@/app/(protected)/clubs/actions";
import { Button } from "@/components/ui/button";

type PinThreadButtonProps = {
  clubId: string;
  clubBookId: string;
  threadId: string;
  isPinned: boolean;
  returnTo: string;
};

export function PinThreadButton({
  clubId,
  clubBookId,
  threadId,
  isPinned,
  returnTo,
}: PinThreadButtonProps) {
  return (
    <form action={toggleThreadPinAction}>
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="clubBookId" value={clubBookId} />
      <input type="hidden" name="threadId" value={threadId} />
      <input type="hidden" name="intent" value={isPinned ? "unpin" : "pin"} />
      <input type="hidden" name="returnTo" value={returnTo} />

      <Button type="submit" variant="secondary" size="sm">
        {isPinned ? "Unpin thread" : "Pin thread"}
      </Button>
    </form>
  );
}

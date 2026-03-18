import Link from "next/link";

import { Button, buttonStyles } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ShelfFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  defaults?: {
    name?: string;
    description?: string | null;
    isPublic?: boolean;
  };
  shelfId?: string;
  returnTo?: string;
  cancelHref?: string;
};

export function ShelfForm({
  action,
  submitLabel,
  defaults,
  shelfId,
  returnTo,
  cancelHref,
}: ShelfFormProps) {
  return (
    <form action={action} className="space-y-5">
      {shelfId ? <input type="hidden" name="shelfId" value={shelfId} /> : null}
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}

      <label className="block space-y-2 text-sm font-medium">
        <span>Name</span>
        <Input
          name="name"
          required
          maxLength={80}
          defaultValue={defaults?.name ?? ""}
          placeholder="Weekend favorites"
        />
      </label>

      <label className="block space-y-2 text-sm font-medium">
        <span>Description</span>
        <Textarea
          name="description"
          maxLength={400}
          defaultValue={defaults?.description ?? ""}
          placeholder="What belongs on this shelf and why."
        />
      </label>

      <label className="block space-y-2 text-sm font-medium">
        <span>Visibility</span>
        <select
          name="isPublic"
          defaultValue={defaults?.isPublic ? "true" : "false"}
          className="h-11 w-full rounded-md border border-(--border) bg-(--surface-strong) px-3 text-sm shadow-sm outline-none transition focus:border-(--accent) focus:ring-2 focus:ring-(--accent-soft)"
        >
          <option value="false">Private</option>
          <option value="true">Public</option>
        </select>
      </label>

      <div className="flex flex-wrap gap-2">
        <Button type="submit">{submitLabel}</Button>
        {cancelHref ? (
          <Link href={cancelHref} className={buttonStyles({ variant: "secondary" })}>
            Cancel
          </Link>
        ) : null}
      </div>
    </form>
  );
}

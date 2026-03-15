import { addBookToClubFromVolumeAction } from "@/app/(protected)/clubs/actions";
import { CLUB_BOOK_STATUS_LABELS, CLUB_BOOK_STATUS_ORDER } from "@/lib/clubs/presentation";
import type { ManageableClubSummary } from "@/lib/clubs/repository";
import { Button } from "@/components/ui/button";

type AddBookToClubFormProps = {
  googleVolumeId: string;
  clubs: ManageableClubSummary[];
};

export function AddBookToClubForm({
  googleVolumeId,
  clubs,
}: AddBookToClubFormProps) {
  if (clubs.length === 0) {
    return (
      <p className="text-sm text-(--muted)">
        Join or create a club where you are an owner or admin to add this book
        into a shared reading section.
      </p>
    );
  }

  return (
    <form action={addBookToClubFromVolumeAction} className="grid gap-3 md:grid-cols-[1.2fr_1fr_auto]">
      <input type="hidden" name="googleVolumeId" value={googleVolumeId} />
      <input type="hidden" name="returnTo" value={`/books/${encodeURIComponent(googleVolumeId)}`} />

      <label className="space-y-2 text-sm font-medium">
        <span>Club</span>
        <select
          name="clubId"
          className="h-11 w-full rounded-md border border-(--border) bg-(--surface-strong) px-3 text-sm shadow-sm outline-none transition focus:border-(--accent) focus:ring-2 focus:ring-(--accent-soft)"
          defaultValue={clubs[0]?.id}
        >
          {clubs.map((club) => (
            <option key={club.id} value={club.id}>
              {club.name} ({club.currentUserRole})
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2 text-sm font-medium">
        <span>Section</span>
        <select
          name="status"
          className="h-11 w-full rounded-md border border-(--border) bg-(--surface-strong) px-3 text-sm shadow-sm outline-none transition focus:border-(--accent) focus:ring-2 focus:ring-(--accent-soft)"
          defaultValue="WANT_TO_READ"
        >
          {CLUB_BOOK_STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {CLUB_BOOK_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-end">
        <Button type="submit" className="w-full md:w-auto">
          Add to club
        </Button>
      </div>
    </form>
  );
}

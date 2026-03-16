import { ArrowRightLeft, BookOpen, ChevronDown, MessageSquare, Trash2 } from "lucide-react";
import Link from "next/link";

import {
  moveClubBookAction,
  removeClubBookAction,
} from "@/app/(protected)/clubs/actions";
import { Button, buttonStyles } from "@/components/ui/button";
import { createManageSectionHref } from "@/lib/clubs/manage-paths";
import {
  CLUB_BOOK_STATUS_LABELS,
  CLUB_BOOK_STATUS_ORDER,
} from "@/lib/clubs/presentation";
import type { ClubBookWithBook } from "@/lib/clubs/repository";

type ClubBookCardProps = {
  clubBook: ClubBookWithBook;
  clubId: string;
  showManageControls: boolean;
  returnTo?: string;
};

function formatAuthors(clubBook: ClubBookWithBook) {
  return clubBook.book.authors.length > 0
    ? clubBook.book.authors.join(", ")
    : "Unknown author";
}

function formatPublishedDate(clubBook: ClubBookWithBook) {
  return clubBook.book.publishedDate
    ? `Published ${clubBook.book.publishedDate}`
    : "Published date unavailable";
}

export function ClubBookCard({
  clubBook,
  clubId,
  showManageControls,
  returnTo,
}: ClubBookCardProps) {
  const managementReturnTo =
    returnTo ??
    createManageSectionHref({
      clubId,
      section: "board",
    });

  return (
    <details className="group rounded-xl border border-(--border)/80 bg-(--surface)">
      <summary
        aria-label={`Toggle details for ${clubBook.book.title}`}
        className="flex cursor-pointer list-none items-start justify-between gap-4 px-4 py-4 transition-colors hover:bg-(--surface-strong) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-soft)"
      >
        <div className="min-w-0 space-y-1">
          <h3 className="text-base font-semibold leading-tight sm:text-lg">
            {clubBook.book.title}
          </h3>
          <p className="text-sm text-(--muted)">{formatAuthors(clubBook)}</p>
          <p className="text-xs text-(--muted)">
            {formatPublishedDate(clubBook)}
          </p>
        </div>

        <ChevronDown
          aria-hidden
          className="mt-1 h-4 w-4 shrink-0 text-(--muted) transition-transform duration-200 group-open:rotate-180"
        />
      </summary>

      <div className="space-y-4 border-t border-(--border)/70 px-4 py-4">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/books/${encodeURIComponent(clubBook.book.googleVolumeId)}`}
            className={buttonStyles({ variant: "secondary", size: "sm" })}
          >
            <BookOpen aria-hidden className="h-4 w-4 shrink-0" />
            Book details
          </Link>
          <Link
            href={`/clubs/${clubId}/books/${clubBook.id}`}
            className={buttonStyles({ size: "sm" })}
          >
            <MessageSquare aria-hidden className="h-4 w-4 shrink-0" />
            Discussion
          </Link>
        </div>

        {showManageControls ? (
          <div className="rounded-lg border border-(--border)/70 bg-(--surface-strong) p-3">
            <form
              action={moveClubBookAction}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <input type="hidden" name="clubId" value={clubId} />
              <input type="hidden" name="clubBookId" value={clubBook.id} />
              <input type="hidden" name="returnTo" value={managementReturnTo} />
              <label className="flex-1 space-y-1 text-xs font-medium uppercase tracking-wide text-(--muted)">
                <span>Move section</span>
                <select
                  name="status"
                  defaultValue={clubBook.status}
                  className="h-10 w-full rounded-md border border-(--border) bg-(--surface) px-3 text-sm text-foreground outline-none transition focus:border-(--accent) focus:ring-2 focus:ring-(--accent-soft)"
                >
                  {CLUB_BOOK_STATUS_ORDER.map((status) => (
                    <option key={status} value={status}>
                      {CLUB_BOOK_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end gap-2">
                <Button type="submit" size="sm">
                  <ArrowRightLeft aria-hidden className="h-4 w-4 shrink-0" />
                  Move
                </Button>
              </div>
            </form>

            <form action={removeClubBookAction} className="mt-2">
              <input type="hidden" name="clubId" value={clubId} />
              <input type="hidden" name="clubBookId" value={clubBook.id} />
              <input type="hidden" name="returnTo" value={managementReturnTo} />
              <Button type="submit" variant="destructive" size="sm">
                <Trash2 aria-hidden className="h-4 w-4 shrink-0" />
                Remove
              </Button>
            </form>
          </div>
        ) : null}
      </div>
    </details>
  );
}

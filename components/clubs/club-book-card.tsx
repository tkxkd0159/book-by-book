import Image from "next/image";
import Link from "next/link";

import { moveClubBookAction, removeClubBookAction } from "@/app/(protected)/clubs/actions";
import { CLUB_BOOK_STATUS_LABELS, CLUB_BOOK_STATUS_ORDER } from "@/lib/clubs/presentation";
import type { ClubBookWithBook } from "@/lib/clubs/repository";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ClubBookCardProps = {
  clubBook: ClubBookWithBook;
  clubId: string;
  canManage: boolean;
};

export function ClubBookCard({ clubBook, clubId, canManage }: ClubBookCardProps) {
  return (
    <Card className="h-full border-(--border)/80 bg-(--surface)">
      <CardContent className="flex h-full flex-col gap-4 p-4">
        <div className="flex gap-4">
          <div className="relative h-28 w-20 overflow-hidden rounded-lg border border-(--border) bg-white">
            {clubBook.book.thumbnailUrl ? (
              <Image
                src={clubBook.book.thumbnailUrl}
                alt={`${clubBook.book.title} cover`}
                fill
                sizes="80px"
                className="object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-2 text-center text-xs text-(--muted)">
                No cover
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs uppercase tracking-wide text-(--muted)">
              {CLUB_BOOK_STATUS_LABELS[clubBook.status]}
            </p>
            <h3 className="text-lg font-semibold leading-tight">
              <Link
                href={`/books/${encodeURIComponent(clubBook.book.googleVolumeId)}`}
                className="hover:underline"
              >
                {clubBook.book.title}
              </Link>
            </h3>
            <p className="text-sm text-(--muted)">
              {clubBook.book.authors.length > 0
                ? clubBook.book.authors.join(", ")
                : "Unknown author"}
            </p>
            {clubBook.book.publishedDate ? (
              <p className="text-xs text-(--muted)">
                Published {clubBook.book.publishedDate}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-auto flex flex-wrap gap-2">
          <Link
            href={`/books/${encodeURIComponent(clubBook.book.googleVolumeId)}`}
            className={buttonStyles({ variant: "secondary", size: "sm" })}
          >
            Open book
          </Link>
        </div>

        {canManage ? (
          <div className="rounded-lg border border-(--border)/70 bg-(--surface-strong) p-3">
            <form action={moveClubBookAction} className="flex flex-col gap-2 sm:flex-row">
              <input type="hidden" name="clubId" value={clubId} />
              <input type="hidden" name="clubBookId" value={clubBook.id} />
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
                  Move
                </Button>
              </div>
            </form>

            <form action={removeClubBookAction} className="mt-2">
              <input type="hidden" name="clubId" value={clubId} />
              <input type="hidden" name="clubBookId" value={clubBook.id} />
              <Button type="submit" variant="destructive" size="sm">
                Remove
              </Button>
            </form>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

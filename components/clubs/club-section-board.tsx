import { CLUB_BOOK_STATUS_LABELS, CLUB_BOOK_STATUS_ORDER } from "@/lib/clubs/presentation";
import type { ClubBookWithBook } from "@/lib/clubs/repository";
import { ClubBookCard } from "@/components/clubs/club-book-card";

type ClubSectionBoardProps = {
  clubId: string;
  books: ClubBookWithBook[];
  mode?: "browse" | "manage";
  returnTo?: string;
};

export function ClubSectionBoard({
  clubId,
  books,
  mode = "browse",
  returnTo,
}: ClubSectionBoardProps) {
  const showManageControls = mode === "manage";

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      {CLUB_BOOK_STATUS_ORDER.map((status) => {
        const sectionBooks = books.filter((book) => book.status === status);

        return (
          <section
            key={status}
            className="rounded-2xl border border-(--border) bg-(--surface-strong) p-4"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">
                {CLUB_BOOK_STATUS_LABELS[status]}
              </h2>
              <span className="text-sm text-(--muted)">
                {sectionBooks.length} book{sectionBooks.length === 1 ? "" : "s"}
              </span>
            </div>

            {sectionBooks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-(--border) bg-(--surface) p-4 text-sm text-(--muted)">
                No books in this section yet.
              </p>
            ) : (
              <div className="grid gap-4">
                {sectionBooks.map((book) => (
                  <ClubBookCard
                    key={book.id}
                    clubBook={book}
                    clubId={clubId}
                    showManageControls={showManageControls}
                    returnTo={returnTo}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

"use client";

import { ArrowRight, Plus, X } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { useFormStatus } from "react-dom";

import { addBooksFromShelfToClubAction } from "@/app/(protected)/clubs/actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import type { ShelfImportSource } from "@/lib/clubs/repository";

type AddBooksFromShelvesModalProps = {
  clubId: string;
  returnTo: string;
  sources: ShelfImportSource[];
};

function AddFromShelvesSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={disabled || pending}>
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
          Adding...
        </span>
      ) : (
        <>
          <Plus aria-hidden className="h-4 w-4 shrink-0" />
          Add to Want to Read
        </>
      )}
    </Button>
  );
}

export function AddBooksFromShelvesModal({
  clubId,
  returnTo,
  sources,
}: AddBooksFromShelvesModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedShelfId, setSelectedShelfId] = useState(sources[0]?.shelfId ?? "");
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const titleId = useId();
  const activeSource =
    sources.find((source) => source.shelfId === selectedShelfId) ?? null;

  function closeModal() {
    setIsOpen(false);
    setSelectedShelfId(sources[0]?.shelfId ?? "");
    setSelectedBookIds([]);
  }

  function openModal() {
    setSelectedShelfId(sources[0]?.shelfId ?? "");
    setSelectedBookIds([]);
    setIsOpen(true);
  }

  function toggleBookSelection(bookId: string, checked: boolean) {
    setSelectedBookIds((current) => {
      if (checked) {
        return current.includes(bookId) ? current : [...current, bookId];
      }

      return current.filter((currentBookId) => currentBookId !== bookId);
    });
  }

  return (
    <>
      <Button variant="secondary" onClick={openModal}>
        <Plus aria-hidden className="h-4 w-4 shrink-0" />
        Add from shelves
      </Button>

      <ModalShell
        open={isOpen}
        onClose={closeModal}
        titleId={titleId}
        contentClassName="max-w-2xl"
        rootName="club-shelf-import"
      >
        <form
          action={addBooksFromShelfToClubAction}
          className="space-y-5 p-6 sm:p-7"
        >
          <input type="hidden" name="clubId" value={clubId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          {selectedShelfId ? (
            <input type="hidden" name="shelfId" value={selectedShelfId} />
          ) : null}

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-(--muted)">Reading board</p>
              <h2 id={titleId} className="text-2xl font-semibold">
                Add from shelves
              </h2>
              <p className="text-sm text-(--muted)">
                Import books from one of your shelves into this club&apos;s Want
                to Read section.
              </p>
            </div>

            <Button
              aria-label="Close add-from-shelves modal"
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={closeModal}
            >
              <X aria-hidden className="h-4 w-4 shrink-0" />
            </Button>
          </div>

          {sources.length === 0 ? (
            <div className="space-y-3 rounded-xl border border-dashed border-(--border) bg-(--surface) p-5">
              <p className="text-sm text-(--muted)">
                Create a shelf and add books there before importing them into the
                club.
              </p>
              <Link
                href="/me/shelves/new"
                className={buttonStyles({ variant: "secondary" })}
              >
                <ArrowRight aria-hidden className="h-4 w-4 shrink-0" />
                Create a shelf
              </Link>
            </div>
          ) : (
            <>
              <label className="block space-y-2 text-sm font-medium">
                <span>Choose a shelf</span>
                <select
                  value={selectedShelfId}
                  onChange={(event) => {
                    setSelectedShelfId(event.currentTarget.value);
                    setSelectedBookIds([]);
                  }}
                  className="h-11 w-full rounded-md border border-(--border) bg-(--surface) px-3 text-sm text-foreground outline-none transition focus:border-(--accent) focus:ring-2 focus:ring-(--accent-soft)"
                >
                  {sources.map((source) => (
                    <option key={source.shelfId} value={source.shelfId}>
                      {`${source.shelfName} (${source.books.length} ready)`}
                    </option>
                  ))}
                </select>
              </label>

              {activeSource ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={activeSource.isPublic ? "success" : "neutral"}>
                      {activeSource.isPublic ? "Public" : "Private"}
                    </Badge>
                    <Badge>{`${activeSource.books.length} eligible book${activeSource.books.length === 1 ? "" : "s"}`}</Badge>
                  </div>

                  {activeSource.books.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-(--border) bg-(--surface) p-5 text-sm text-(--muted)">
                      Every book from this shelf is already active in the club,
                      or the shelf has no books yet.
                    </div>
                  ) : (
                    <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
                      {activeSource.books.map((book) => {
                        const isChecked = selectedBookIds.includes(book.bookId);

                        return (
                          <label
                            key={book.bookId}
                            className="flex items-start gap-3 rounded-xl border border-(--border) bg-(--surface) p-4"
                          >
                            <input
                              type="checkbox"
                              name="bookId"
                              value={book.bookId}
                              checked={isChecked}
                              onChange={(event) => {
                                toggleBookSelection(
                                  book.bookId,
                                  event.currentTarget.checked,
                                );
                              }}
                              className="mt-1 h-4 w-4 rounded border-(--border)"
                            />

                            <div className="flex-1 space-y-2">
                              <div className="space-y-1">
                                <p className="font-medium">{book.title}</p>
                                <p className="text-sm text-(--muted)">
                                  {book.authors.length > 0
                                    ? book.authors.join(", ")
                                    : "Unknown author"}
                                </p>
                              </div>

                              {book.note ? (
                                <p className="rounded-lg border border-(--border) bg-(--surface-strong) px-3 py-2 text-sm text-(--muted)">
                                  {book.note}
                                </p>
                              ) : null}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-(--border) pt-4">
            <p className="text-sm text-(--muted)">
              {selectedBookIds.length > 0
                ? `${selectedBookIds.length} book${selectedBookIds.length === 1 ? "" : "s"} selected`
                : "No shelf books selected yet."}
            </p>

            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={closeModal}>
                Cancel
              </Button>
              <AddFromShelvesSubmitButton
                disabled={!activeSource || selectedBookIds.length === 0}
              />
            </div>
          </div>
        </form>
      </ModalShell>
    </>
  );
}

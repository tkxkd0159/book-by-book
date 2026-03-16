"use client";

import { ArrowRight, Plus, X } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { useFormStatus } from "react-dom";

import { addBookToClubsFromVolumeAction } from "@/app/(protected)/clubs/actions";
import { Badge } from "@/components/ui/badge";
import { ModalShell } from "@/components/ui/modal-shell";
import { Button, buttonStyles, type ButtonProps } from "@/components/ui/button";
import { summarizeManageableClubBookTargets } from "@/lib/clubs/book-targets";
import {
  CLUB_BOOK_STATUS_BADGE_VARIANTS,
  CLUB_BOOK_STATUS_LABELS,
  CLUB_ROLE_BADGE_VARIANTS,
} from "@/lib/clubs/presentation";
import type { ManageableClubBookTarget } from "@/lib/clubs/repository";

type AddBookToClubsModalProps = {
  googleVolumeId: string;
  bookTitle: string;
  clubTargets: ManageableClubBookTarget[];
  returnTo: string;
  triggerClassName?: string;
  triggerSize?: ButtonProps["size"];
  triggerVariant?: ButtonProps["variant"];
};

function AddBookSubmitButton({ disabled }: { disabled: boolean }) {
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
          Add Book
        </>
      )}
    </Button>
  );
}

export function AddBookToClubsModal({
  googleVolumeId,
  bookTitle,
  clubTargets,
  returnTo,
  triggerClassName,
  triggerSize = "sm",
  triggerVariant = "default",
}: AddBookToClubsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClubIds, setSelectedClubIds] = useState<string[]>([]);
  const titleId = useId();
  const summary = summarizeManageableClubBookTargets(clubTargets);

  function closeModal() {
    setIsOpen(false);
    setSelectedClubIds([]);
  }

  function openModal() {
    setSelectedClubIds([]);
    setIsOpen(true);
  }

  function toggleClubSelection(clubId: string, checked: boolean) {
    setSelectedClubIds((current) => {
      if (checked) {
        return current.includes(clubId) ? current : [...current, clubId];
      }

      return current.filter((selectedClubId) => selectedClubId !== clubId);
    });
  }

  return (
    <>
      <Button
        size={triggerSize}
        variant={triggerVariant}
        className={triggerClassName}
        onClick={openModal}
      >
        <Plus aria-hidden className="h-4 w-4 shrink-0" />
        Add Book
      </Button>

      <ModalShell
        open={isOpen}
        onClose={closeModal}
        titleId={titleId}
        contentClassName="max-w-2xl"
        rootName="book-add"
      >
        <form
          action={addBookToClubsFromVolumeAction}
          className="space-y-5 p-6 sm:p-7"
        >
          <input type="hidden" name="googleVolumeId" value={googleVolumeId} />
          <input type="hidden" name="returnTo" value={returnTo} />

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-(--muted)">Add Book</p>
              <h2 id={titleId} className="text-2xl font-semibold">
                {bookTitle}
              </h2>
              <p className="text-sm text-(--muted)">
                Add this title to one or more clubs you manage. New additions
                always start in Want to Read.
              </p>
            </div>

            <Button
              aria-label="Close add-book modal"
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={closeModal}
            >
              <X aria-hidden className="h-4 w-4 shrink-0" />
            </Button>
          </div>

          {summary.state === "no-manageable-clubs" ? (
            <div className="space-y-3 rounded-xl border border-dashed border-(--border) bg-(--surface) p-5">
              <p className="text-sm text-(--muted)">
                You need a club where you are an owner or admin before you can
                add books.
              </p>
              <Link
                href="/clubs"
                className={buttonStyles({ variant: "secondary" })}
              >
                <ArrowRight aria-hidden className="h-4 w-4 shrink-0" />
                Go to clubs
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {summary.state === "all-already-added" ? (
                <p className="text-sm text-(--muted)">
                  This book is already active in every club you manage.
                </p>
              ) : (
                <p className="text-sm text-(--muted)">
                  Select one or more clubs to add this book.
                </p>
              )}

              <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
                {clubTargets.map((target) => {
                  const isChecked = selectedClubIds.includes(target.clubId);
                  const isDisabled = target.alreadyAdded;

                  return (
                    <label
                      key={target.clubId}
                      className={`flex items-start gap-3 rounded-xl border p-4 transition ${
                        isDisabled
                          ? "border-(--border) bg-(--surface) opacity-75"
                          : "cursor-pointer border-(--border) bg-(--surface)"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="clubId"
                        value={target.clubId}
                        checked={isChecked}
                        disabled={isDisabled}
                        onChange={(event) => {
                          toggleClubSelection(
                            target.clubId,
                            event.currentTarget.checked,
                          );
                        }}
                        className="mt-1 h-4 w-4 rounded border-(--border)"
                      />

                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{target.clubName}</p>
                          <Badge
                            variant={
                              CLUB_ROLE_BADGE_VARIANTS[target.currentUserRole]
                            }
                          >
                            {target.currentUserRole}
                          </Badge>
                          {target.existingStatus ? (
                            <Badge
                              variant={
                                CLUB_BOOK_STATUS_BADGE_VARIANTS[
                                  target.existingStatus
                                ]
                              }
                            >
                              {CLUB_BOOK_STATUS_LABELS[target.existingStatus]}
                            </Badge>
                          ) : null}
                        </div>

                        <p className="text-sm text-(--muted)">
                          {target.alreadyAdded
                            ? "Already added to this club."
                            : "Ready to add to Want to Read."}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-(--border) pt-4">
            <p className="text-sm text-(--muted)">
              {selectedClubIds.length > 0
                ? `${selectedClubIds.length} club${selectedClubIds.length === 1 ? "" : "s"} selected`
                : "No clubs selected yet."}
            </p>

            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={closeModal}>
                Cancel
              </Button>
              <AddBookSubmitButton disabled={selectedClubIds.length === 0} />
            </div>
          </div>
        </form>
      </ModalShell>
    </>
  );
}

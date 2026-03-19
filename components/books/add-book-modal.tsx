"use client";

import { ArrowRight, Plus, X } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { useFormStatus } from "react-dom";

import { addBookToClubsFromVolumeAction } from "@/app/(protected)/clubs/actions";
import { addBookToShelvesFromVolumeAction } from "@/app/(protected)/me/shelves/actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles, type ButtonProps } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { summarizeManageableClubBookTargets } from "@/lib/clubs/book-targets";
import {
  CLUB_BOOK_STATUS_BADGE_VARIANTS,
  CLUB_BOOK_STATUS_LABELS,
  CLUB_ROLE_BADGE_VARIANTS,
} from "@/lib/clubs/presentation";
import type { ManageableClubBookTarget } from "@/lib/clubs/repository";
import { summarizeManageableShelfBookTargets } from "@/lib/shelves/book-targets";
import type { ManageableShelfBookTarget } from "@/lib/shelves/repository";

type AddBookModalProps = {
  googleVolumeId: string;
  bookTitle: string;
  clubTargets: ManageableClubBookTarget[];
  shelfTargets: ManageableShelfBookTarget[];
  returnTo: string;
  bookImportToken?: string;
  triggerClassName?: string;
  triggerSize?: ButtonProps["size"];
  triggerVariant?: ButtonProps["variant"];
};

type AddBookTab = "clubs" | "shelves";

function AddBookSubmitButton({
  disabled,
  label,
}: {
  disabled: boolean;
  label: string;
}) {
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
          {label}
        </>
      )}
    </Button>
  );
}

function TabButton({
  isActive,
  id,
  panelId,
  label,
  onClick,
}: {
  isActive: boolean;
  id: string;
  panelId: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      id={id}
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={panelId}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        isActive
          ? "bg-(--accent) text-(--accent-foreground) shadow-sm"
          : "bg-(--surface) text-(--muted) hover:bg-(--surface-strong)"
      }`}
    >
      {label}
    </button>
  );
}

export function AddBookModal({
  googleVolumeId,
  bookTitle,
  clubTargets,
  shelfTargets,
  returnTo,
  bookImportToken,
  triggerClassName,
  triggerSize = "sm",
  triggerVariant = "default",
}: AddBookModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AddBookTab>("clubs");
  const [selectedClubIds, setSelectedClubIds] = useState<string[]>([]);
  const [selectedShelfIds, setSelectedShelfIds] = useState<string[]>([]);
  const titleId = useId();
  const clubsTabId = useId();
  const shelvesTabId = useId();
  const clubsPanelId = useId();
  const shelvesPanelId = useId();
  const clubSummary = summarizeManageableClubBookTargets(clubTargets);
  const shelfSummary = summarizeManageableShelfBookTargets(shelfTargets);

  function closeModal() {
    setIsOpen(false);
    setActiveTab("clubs");
    setSelectedClubIds([]);
    setSelectedShelfIds([]);
  }

  function openModal() {
    setSelectedClubIds([]);
    setSelectedShelfIds([]);
    setActiveTab("clubs");
    setIsOpen(true);
  }

  function toggleSelection(
    id: string,
    checked: boolean,
    setCurrent: (updater: (value: string[]) => string[]) => void,
  ) {
    setCurrent((values) => {
      if (checked) {
        return values.includes(id) ? values : [...values, id];
      }

      return values.filter((value) => value !== id);
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
        <div className="space-y-5 p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-(--muted)">Add Book</p>
              <h2 id={titleId} className="text-2xl font-semibold">
                {bookTitle}
              </h2>
              <p className="text-sm text-(--muted)">
                Choose whether to add this title to your managed clubs or your
                personal shelves.
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

          <div
            role="tablist"
            aria-label="Add book destinations"
            className="inline-flex rounded-full border border-(--border) bg-(--surface)/80 p-1"
          >
            <TabButton
              id={clubsTabId}
              panelId={clubsPanelId}
              isActive={activeTab === "clubs"}
              label={`Clubs (${clubTargets.length})`}
              onClick={() => setActiveTab("clubs")}
            />
            <TabButton
              id={shelvesTabId}
              panelId={shelvesPanelId}
              isActive={activeTab === "shelves"}
              label={`Shelves (${shelfTargets.length})`}
              onClick={() => setActiveTab("shelves")}
            />
          </div>

          {activeTab === "clubs" ? (
            <form
              action={addBookToClubsFromVolumeAction}
              role="tabpanel"
              id={clubsPanelId}
              aria-labelledby={clubsTabId}
              className="space-y-5"
            >
              <input type="hidden" name="googleVolumeId" value={googleVolumeId} />
              <input type="hidden" name="returnTo" value={returnTo} />
              {bookImportToken ? (
                <input
                  type="hidden"
                  name="bookImportToken"
                  value={bookImportToken}
                />
              ) : null}

              {clubSummary.state === "no-manageable-clubs" ? (
                <div className="space-y-3 rounded-xl border border-dashed border-(--border) bg-(--surface) p-5">
                  <p className="text-sm text-(--muted)">
                    You need a club where you are an owner or admin before you
                    can add books.
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
                  {clubSummary.state === "all-already-added" ? (
                    <p className="text-sm text-(--muted)">
                      This book is already active in every club you manage.
                    </p>
                  ) : (
                    <p className="text-sm text-(--muted)">
                      Select one or more clubs to add this book. New additions
                      always start in Want to Read.
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
                              toggleSelection(
                                target.clubId,
                                event.currentTarget.checked,
                                setSelectedClubIds,
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
                  <AddBookSubmitButton
                    disabled={selectedClubIds.length === 0}
                    label="Add to clubs"
                  />
                </div>
              </div>
            </form>
          ) : (
            <form
              action={addBookToShelvesFromVolumeAction}
              role="tabpanel"
              id={shelvesPanelId}
              aria-labelledby={shelvesTabId}
              className="space-y-5"
            >
              <input type="hidden" name="googleVolumeId" value={googleVolumeId} />
              <input type="hidden" name="returnTo" value={returnTo} />
              {bookImportToken ? (
                <input
                  type="hidden"
                  name="bookImportToken"
                  value={bookImportToken}
                />
              ) : null}

              {shelfSummary.state === "no-shelves" ? (
                <div className="space-y-3 rounded-xl border border-dashed border-(--border) bg-(--surface) p-5">
                  <p className="text-sm text-(--muted)">
                    Create a shelf before you can organize books into personal
                    lists.
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
                <div className="space-y-3">
                  {shelfSummary.state === "all-already-added" ? (
                    <p className="text-sm text-(--muted)">
                      This book is already on every shelf you own.
                    </p>
                  ) : (
                    <p className="text-sm text-(--muted)">
                      Select one or more shelves to add this book to your
                      personal collection.
                    </p>
                  )}

                  <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
                    {shelfTargets.map((target) => {
                      const isChecked = selectedShelfIds.includes(target.shelfId);
                      const isDisabled = target.alreadyAdded;

                      return (
                        <label
                          key={target.shelfId}
                          className={`flex items-start gap-3 rounded-xl border p-4 transition ${
                            isDisabled
                              ? "border-(--border) bg-(--surface) opacity-75"
                              : "cursor-pointer border-(--border) bg-(--surface)"
                          }`}
                        >
                          <input
                            type="checkbox"
                            name="shelfId"
                            value={target.shelfId}
                            checked={isChecked}
                            disabled={isDisabled}
                            onChange={(event) => {
                              toggleSelection(
                                target.shelfId,
                                event.currentTarget.checked,
                                setSelectedShelfIds,
                              );
                            }}
                            className="mt-1 h-4 w-4 rounded border-(--border)"
                          />

                          <div className="flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{target.shelfName}</p>
                              <Badge
                                variant={target.isPublic ? "success" : "neutral"}
                              >
                                {target.isPublic ? "Public" : "Private"}
                              </Badge>
                            </div>

                            <p className="text-sm text-(--muted)">
                              {target.alreadyAdded
                                ? "Already on this shelf."
                                : "Ready to add to this shelf."}
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
                  {selectedShelfIds.length > 0
                    ? `${selectedShelfIds.length} shelf${selectedShelfIds.length === 1 ? "" : "s"} selected`
                    : "No shelves selected yet."}
                </p>

                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={closeModal}>
                    Cancel
                  </Button>
                  <AddBookSubmitButton
                    disabled={selectedShelfIds.length === 0}
                    label="Add to shelves"
                  />
                </div>
              </div>
            </form>
          )}
        </div>
      </ModalShell>
    </>
  );
}

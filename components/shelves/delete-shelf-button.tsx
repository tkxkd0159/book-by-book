"use client";

import { AlertTriangle, Trash2, X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useId, useState } from "react";

import { deleteShelfAction } from "@/app/(protected)/me/shelves/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";

type DeleteShelfButtonProps = {
  shelfId: string;
  shelfName: string;
  returnTo?: string;
};

export function DeleteShelfButton({
  shelfId,
  shelfName,
  returnTo,
}: DeleteShelfButtonProps) {
  const [open, setOpen] = useState(false);
  const [confirmationName, setConfirmationName] = useState("");
  const titleId = useId();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.toString();
  const resolvedReturnTo =
    returnTo ?? (currentQuery ? `${pathname}?${currentQuery}` : pathname);
  const isConfirmationMatch = confirmationName.trim() === shelfName.trim();

  function closeModal() {
    setOpen(false);
    setConfirmationName("");
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden className="h-4 w-4 shrink-0" />
        Delete shelf
      </Button>

      <ModalShell
        open={open}
        onClose={closeModal}
        titleId={titleId}
        rootName="delete-shelf"
      >
        <div className="space-y-5 p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-[#8f2318]">Danger zone</p>
              <h2 id={titleId} className="text-2xl font-semibold">
                Delete {shelfName}?
              </h2>
              <p className="text-sm text-(--muted)">
                This permanently removes the shelf and any books or notes stored
                on it. Type the shelf name exactly to confirm. This cannot be
                undone.
              </p>
            </div>

            <Button
              aria-label="Close delete-shelf modal"
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={closeModal}
            >
              <X aria-hidden className="h-4 w-4 shrink-0" />
            </Button>
          </div>

          <div className="rounded-2xl border border-[#d39e95] bg-[#fff7f5] p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle
                aria-hidden
                className="mt-0.5 h-5 w-5 shrink-0 text-[#8f2318]"
              />
              <p className="text-sm text-[#7e1f14]">
                Public readers lose access immediately and any shelf notes
                disappear with the shelf.
              </p>
            </div>
          </div>

          <form action={deleteShelfAction} className="space-y-4">
            <input type="hidden" name="shelfId" value={shelfId} />
            <input type="hidden" name="returnTo" value={resolvedReturnTo} />

            <label className="block space-y-2 text-sm font-medium">
              <span>Confirm shelf name</span>
              <Input
                value={confirmationName}
                onChange={(event) => setConfirmationName(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder={shelfName}
              />
            </label>

            <p className="text-xs text-(--muted)">
              Type{" "}
              <span className="font-medium text-foreground">{shelfName}</span>{" "}
              to enable deletion.
            </p>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={!isConfirmationMatch}
              >
                <Trash2 aria-hidden className="h-4 w-4 shrink-0" />
                Delete this shelf
              </Button>
            </div>
          </form>
        </div>
      </ModalShell>
    </>
  );
}

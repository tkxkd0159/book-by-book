"use client";

import { AlertTriangle, X } from "lucide-react";
import { useId, useState } from "react";

import { deleteClubAction } from "@/app/(protected)/clubs/actions";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";

type DeleteClubButtonProps = {
  clubId: string;
  clubName: string;
  returnTo: string;
};

export function DeleteClubButton({
  clubId,
  clubName,
  returnTo,
}: DeleteClubButtonProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  function closeModal() {
    setOpen(false);
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Delete club
      </Button>

      <ModalShell
        open={open}
        onClose={closeModal}
        titleId={titleId}
        rootName="delete-club"
      >
        <div className="space-y-5 p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-[#8f2318]">
                Danger zone
              </p>
              <h2 id={titleId} className="text-2xl font-semibold">
                Delete {clubName}?
              </h2>
              <p className="text-sm text-(--muted)">
                This permanently removes the club, member roster, invitations,
                reading board, and discussion history. This cannot be undone.
              </p>
            </div>

            <Button
              aria-label="Close delete-club modal"
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
                Once you confirm, everyone loses access immediately and the club
                will disappear from the app.
              </p>
            </div>
          </div>

          <form action={deleteClubAction} className="flex flex-wrap gap-2">
            <input type="hidden" name="clubId" value={clubId} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive">
              Yes, delete club
            </Button>
          </form>
        </div>
      </ModalShell>
    </>
  );
}

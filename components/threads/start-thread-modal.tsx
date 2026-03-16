"use client";

import { MessageSquarePlus, X } from "lucide-react";
import { useId, useState } from "react";

import { CreateThreadForm } from "@/components/threads/create-thread-form";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";

type StartThreadModalProps = {
  clubId: string;
  clubBookId: string;
  clubName: string;
  bookTitle: string;
};

export function StartThreadModal({
  clubId,
  clubBookId,
  clubName,
  bookTitle,
}: StartThreadModalProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  function closeModal() {
    setOpen(false);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <MessageSquarePlus aria-hidden className="h-4 w-4 shrink-0" />
        Start a thread
      </Button>

      <ModalShell
        open={open}
        onClose={closeModal}
        titleId={titleId}
        rootName="start-thread"
      >
        <div className="space-y-5 p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-(--muted)">
                Discussion starter
              </p>
              <h2 id={titleId} className="text-2xl font-semibold">
                Start a thread
              </h2>
              <p className="text-sm text-(--muted)">
                Open a focused conversation for {bookTitle} in {clubName}.
              </p>
            </div>

            <Button
              aria-label="Close start-thread modal"
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={closeModal}
            >
              <X aria-hidden className="h-4 w-4 shrink-0" />
            </Button>
          </div>

          <CreateThreadForm
            clubId={clubId}
            clubBookId={clubBookId}
            archived={false}
            onCancel={closeModal}
          />
        </div>
      </ModalShell>
    </>
  );
}

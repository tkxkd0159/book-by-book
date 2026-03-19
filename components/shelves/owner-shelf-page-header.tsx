"use client";

import { PencilLine } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { updateShelfAction } from "@/app/(protected)/me/shelves/actions";
import { DeleteShelfButton } from "@/components/shelves/delete-shelf-button";
import { ShelfForm } from "@/components/shelves/shelf-form";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlashToast } from "@/components/ui/flash-toast";
import type { ShelfDetail } from "@/lib/shelves/repository";
import {
  createMyShelvesHref,
  createPublicShelfHref,
} from "@/lib/shelves/view-paths";

type OwnerShelfPageHeaderProps = {
  currentUserId: string;
  shelf: Pick<ShelfDetail, "id" | "name" | "description" | "isPublic">;
  returnTo: string;
  message: string | null;
  error: string | null;
};

export function OwnerShelfPageHeader({
  currentUserId,
  shelf,
  returnTo,
  message,
  error,
}: OwnerShelfPageHeaderProps) {
  const [isEditOpen, setIsEditOpen] = useState(Boolean(error));

  return (
    <div className="space-y-6">
      <FlashToast
        key={`${message ?? ""}:${error ?? ""}`}
        message={message}
        error={error}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold sm:text-4xl">{shelf.name}</h1>
          <p className="text-(--muted)">
            Review this shelf like a reader first, then open edits only when you
            need them.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={createMyShelvesHref()}
            className={buttonStyles({ variant: "secondary" })}
          >
            Back to shelves
          </Link>
          <Button
            variant="secondary"
            aria-expanded={isEditOpen}
            aria-controls="edit-shelf-panel"
            onClick={() => setIsEditOpen((open) => !open)}
          >
            <PencilLine aria-hidden className="h-4 w-4 shrink-0" />
            {isEditOpen ? "Hide edit" : "Edit shelf"}
          </Button>
        </div>
      </div>

      {isEditOpen ? (
        <Card id="edit-shelf-panel" className="border-(--border)/90">
          <CardHeader>
            <CardTitle>Edit shelf</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {shelf.isPublic ? (
              <Link
                href={createPublicShelfHref({
                  userId: currentUserId,
                  shelfId: shelf.id,
                })}
                className={buttonStyles({ variant: "secondary" })}
              >
                Open public view
              </Link>
            ) : null}

            <ShelfForm
              action={updateShelfAction}
              submitLabel="Save"
              shelfId={shelf.id}
              returnTo={returnTo}
              defaults={{
                name: shelf.name,
                description: shelf.description,
                isPublic: shelf.isPublic,
              }}
            />

            <DeleteShelfButton
              shelfId={shelf.id}
              shelfName={shelf.name}
              returnTo={returnTo}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

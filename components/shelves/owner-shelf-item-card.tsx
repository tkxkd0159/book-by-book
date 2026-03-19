"use client";

import Image from "next/image";
import Link from "next/link";
import { PencilLine, Trash2, X } from "lucide-react";
import { useState } from "react";

import {
  removeShelfItemAction,
  updateShelfItemNoteAction,
} from "@/app/(protected)/me/shelves/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { ShelfItemWithBook } from "@/lib/shelves/repository";

type OwnerShelfItemCardProps = {
  item: ShelfItemWithBook;
  shelfId: string;
  returnTo: string;
};

export function OwnerShelfItemCard({
  item,
  shelfId,
  returnTo,
}: OwnerShelfItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <Card className="overflow-hidden border-(--border)/90">
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
          <div className="mx-auto w-full max-w-20 sm:mx-0 sm:w-16 sm:max-w-none">
            <div className="relative aspect-2/3 overflow-hidden rounded-xl border border-(--border) bg-white shadow-sm">
              {item.book.thumbnailUrl ? (
                <Image
                  src={item.book.thumbnailUrl}
                  alt={`${item.book.title} cover`}
                  fill
                  sizes="64px"
                  className="object-contain p-1.5"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-3 text-center text-xs text-(--muted)">
                  No cover
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-start gap-2">
                  <Link
                    href={`/books/${encodeURIComponent(item.book.googleVolumeId)}`}
                    className="text-lg font-semibold text-foreground underline-offset-4 hover:underline"
                  >
                    {item.book.title}
                  </Link>
                  {item.book.subtitle ? (
                    <span className="text-sm text-(--muted)">
                      {item.book.subtitle}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-(--muted)">
                  {item.book.authors.length > 0
                    ? item.book.authors.join(", ")
                    : "Unknown author"}
                </p>
                {item.book.publisher || item.book.publishedDate ? (
                  <p className="text-xs uppercase tracking-wide text-(--muted)">
                    {[item.book.publisher, item.book.publishedDate]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 rounded-full p-0"
                  aria-label={
                    isEditing
                      ? `Cancel shelf item edit for ${item.book.title}`
                      : `Edit shelf item for ${item.book.title}`
                  }
                  onClick={() => setIsEditing((open) => !open)}
                >
                  {isEditing ? (
                    <X aria-hidden className="h-4 w-4 shrink-0" />
                  ) : (
                    <PencilLine aria-hidden className="h-4 w-4 shrink-0" />
                  )}
                </Button>

                <form action={removeShelfItemAction}>
                  <input type="hidden" name="shelfId" value={shelfId} />
                  <input type="hidden" name="bookId" value={item.book.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 rounded-full p-0 text-[#8f2318] hover:bg-[#fff1ee] hover:text-[#741a13]"
                    aria-label={`Remove ${item.book.title} from shelf`}
                  >
                    <Trash2 aria-hidden className="h-4 w-4 shrink-0" />
                  </Button>
                </form>
              </div>
            </div>

            {isEditing ? (
              <div className="rounded-xl border border-(--border)/70 bg-(--surface) p-4">
                <form action={updateShelfItemNoteAction} className="space-y-3">
                  <input type="hidden" name="shelfId" value={shelfId} />
                  <input type="hidden" name="bookId" value={item.book.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <label className="block space-y-2 text-sm font-medium">
                    <span>Note</span>
                    <Textarea
                      name="note"
                      defaultValue={item.note ?? ""}
                      rows={4}
                      placeholder="Add a personal note for this shelf item."
                    />
                  </label>
                  <Button type="submit" size="sm">
                    Save note
                  </Button>
                </form>
              </div>
            ) : item.note ? (
              <div className="rounded-xl border border-(--border)/70 bg-(--surface) p-4">
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-(--muted)">
                  {item.note}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

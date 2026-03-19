import Image from "next/image";
import Link from "next/link";
import { BookOpen, ChevronDown, PencilLine, Trash2 } from "lucide-react";

import {
  removeShelfItemAction,
  updateShelfItemNoteAction,
} from "@/app/(protected)/me/shelves/actions";
import type { ShelfDetail as ShelfDetailRecord } from "@/lib/shelves/repository";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonStyles } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ShelfDetailProps = {
  shelf: ShelfDetailRecord;
  mode: "owner" | "public";
  returnTo?: string;
};

export function ShelfDetail({ shelf, mode, returnTo }: ShelfDetailProps) {
  const managementReturnTo = returnTo ?? `/me/shelves/${shelf.id}`;
  const ownerName = shelf.owner.name ?? "Book by Book Member";

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-2 border-(--border) bg-(--surface-strong)">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-(--accent)/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-[#c78d42]/10 blur-3xl" />

        <CardContent className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={shelf.isPublic ? "success" : "neutral"}>
                {shelf.isPublic ? "Public" : "Private"}
              </Badge>
              <Badge>{`${shelf.itemCount} book${shelf.itemCount === 1 ? "" : "s"}`}</Badge>
            </div>

            <p className="text-[15px] leading-7 text-(--muted)">
              {shelf.description ?? "No shelf description yet."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-xl border border-(--border)/70 bg-(--surface)/80 p-4">
              <p className="text-xs uppercase tracking-wide text-(--muted)">
                Books
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {shelf.itemCount}
              </p>
              <p className="mt-1 text-sm text-(--muted)">
                {shelf.itemCount === 1
                  ? "One title saved here."
                  : "Titles saved here."}
              </p>
            </div>

            <div className="rounded-xl border border-(--border)/70 bg-(--surface)/80 p-4">
              <p className="text-xs uppercase tracking-wide text-(--muted)">
                {mode === "public" ? "Audience" : "Visibility"}
              </p>
              <p className="mt-2 font-semibold text-foreground">
                {mode === "public"
                  ? "Signed-in readers"
                  : shelf.isPublic
                    ? "Visible to readers"
                    : "Only you can view this"}
              </p>
              <p className="mt-1 text-sm text-(--muted)">
                {mode === "public"
                  ? `${ownerName}'s notes and titles, in read-only mode.`
                  : shelf.isPublic
                    ? "Anyone with the public link can browse this shelf."
                    : "This shelf stays private until you switch it to public."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Books</h2>
          <p className="text-sm text-(--muted)">
            {mode === "public"
              ? "This shelf is read-only for public readers."
              : "Books already on this shelf appear here. Open item edits only when you need to adjust notes or remove a title."}
          </p>
        </div>

        {shelf.items.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-(--muted)">
              {mode === "owner" ? (
                <>
                  No books on this shelf yet. Find one from{" "}
                  <Link
                    href="/books/search"
                    className="underline underline-offset-4"
                  >
                    book search
                  </Link>
                  .
                </>
              ) : (
                "No books on this shelf yet."
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {shelf.items.map((item) => (
              <Card
                key={item.id}
                className="overflow-hidden border-(--border)/90"
              >
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
                      <div className="space-y-1.5">
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

                      {item.note ? (
                        <div className="rounded-xl border border-(--border)/70 bg-(--surface) p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-(--muted)">
                            Shelf note
                          </p>
                          <p className="mt-2 text-sm leading-6 text-(--muted)">
                            {item.note}
                          </p>
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/books/${encodeURIComponent(item.book.googleVolumeId)}`}
                          className={buttonStyles({
                            variant: "secondary",
                            size: "sm",
                          })}
                        >
                          <BookOpen aria-hidden className="h-4 w-4 shrink-0" />
                          Open book
                        </Link>
                      </div>
                    </div>
                  </div>

                  {mode === "owner" ? (
                    <details className="group border-t border-(--border)/70 bg-(--surface)/40">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-(--surface) sm:px-5 [&::-webkit-details-marker]:hidden">
                        <span className="inline-flex items-center gap-2">
                          <PencilLine
                            aria-hidden
                            className="h-4 w-4 shrink-0 text-(--muted)"
                          />
                          Edit shelf item
                        </span>
                        <ChevronDown
                          aria-hidden
                          className="h-4 w-4 shrink-0 text-(--muted) transition-transform duration-200 group-open:rotate-180"
                        />
                      </summary>

                      <div className="space-y-4 border-t border-(--border)/70 px-4 py-4 sm:px-5">
                        <form
                          action={updateShelfItemNoteAction}
                          className="space-y-3"
                        >
                          <input
                            type="hidden"
                            name="shelfId"
                            value={shelf.id}
                          />
                          <input
                            type="hidden"
                            name="bookId"
                            value={item.book.id}
                          />
                          <input
                            type="hidden"
                            name="returnTo"
                            value={managementReturnTo}
                          />
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

                        <form action={removeShelfItemAction}>
                          <input
                            type="hidden"
                            name="shelfId"
                            value={shelf.id}
                          />
                          <input
                            type="hidden"
                            name="bookId"
                            value={item.book.id}
                          />
                          <input
                            type="hidden"
                            name="returnTo"
                            value={managementReturnTo}
                          />
                          <Button type="submit" variant="destructive" size="sm">
                            <Trash2 aria-hidden className="h-4 w-4 shrink-0" />
                            Remove book
                          </Button>
                        </form>
                      </div>
                    </details>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";

import type { ShelfDetail as ShelfDetailRecord } from "@/lib/shelves/repository";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonStyles } from "@/components/ui/button";

type ShelfDetailProps = {
  shelf: ShelfDetailRecord;
  mode: "owner" | "public";
};

export function ShelfDetail({ shelf, mode }: ShelfDetailProps) {
  return (
    <div className="space-y-6">
      <Card className="border-2 border-(--border) bg-(--surface-strong)">
        <CardContent className="space-y-5 p-6 sm:p-8">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={shelf.isPublic ? "success" : "neutral"}>
                {shelf.isPublic ? "Public" : "Private"}
              </Badge>
              <Badge>{`${shelf.itemCount} book${shelf.itemCount === 1 ? "" : "s"}`}</Badge>
            </div>

            <p className="text-(--muted)">
              {mode === "public"
                ? `Shared by ${shelf.owner.name ?? "Book by Book Member"}.`
                : "Your personal reading shelf."}
            </p>

            <p className="text-sm leading-6 text-(--muted)">
              {shelf.description ?? "No shelf description yet."}
            </p>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Books</h2>
          <p className="text-sm text-(--muted)">
            {mode === "public"
              ? "This shelf is read-only for public readers."
              : "Books already on this shelf appear here. You can update shelf details from this page."}
          </p>
        </div>

        {shelf.items.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-(--muted)">
              No books on this shelf yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {shelf.items.map((item) => (
              <Card key={item.id} className="border-(--border)/90">
                <CardContent className="space-y-4 p-5">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
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
                  </div>

                  {item.note ? (
                    <div className="rounded-xl border border-(--border) bg-(--surface) p-4 text-sm leading-6 text-(--muted)">
                      {item.note}
                    </div>
                  ) : null}

                  <Link
                    href={`/books/${encodeURIComponent(item.book.googleVolumeId)}`}
                    className={buttonStyles({ variant: "secondary", size: "sm" })}
                  >
                    Open book
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

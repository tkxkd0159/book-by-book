import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ensureBookInDatabase } from "@/lib/books/repository";

type BookDetailPageProps = {
  params: Promise<{ googleVolumeId: string }>;
};

function fallbackText(value: string | null | undefined, fallback = "N/A") {
  return value && value.trim().length > 0 ? value : fallback;
}

export default async function BookDetailPage({ params }: BookDetailPageProps) {
  const { googleVolumeId } = await params;
  const book = await ensureBookInDatabase(googleVolumeId);

  if (!book) {
    notFound();
  }

  const description = book.description;

  return (
    <article className="space-y-6">
      <Card className="relative overflow-hidden border-2 border-(--border) bg-(--surface-strong)">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-(--accent)/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-4 h-56 w-56 rounded-full bg-[#c78d42]/10 blur-3xl" />

        <CardContent className="relative grid gap-6 p-6 lg:grid-cols-[220px_1fr] lg:p-8">
          <div className="mx-auto w-full max-w-55">
            <div className="relative aspect-2/3 w-full overflow-hidden rounded-xl border border-(--border) bg-white p-2 shadow-[0_8px_20px_rgba(42,32,18,0.12)]">
              {book.thumbnailUrl ? (
                <Image
                  src={book.thumbnailUrl}
                  alt={`${book.title} cover`}
                  fill
                  sizes="(max-width: 1024px) 220px, 220px"
                  className="object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-4 text-center text-sm text-(--muted)">
                  Cover image unavailable
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <header className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>ID</Badge>
                <code className="rounded-md bg-(--surface) px-2 py-1 text-xs">
                  {book.googleVolumeId}
                </code>
              </div>
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                {book.title}
              </h1>
              {book.subtitle ? (
                <p className="text-lg text-(--muted)">{book.subtitle}</p>
              ) : null}
              <p className="text-(--muted)">
                {book.authors.length > 0
                  ? book.authors.join(", ")
                  : "Unknown author"}
              </p>
            </header>

            <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-(--border)/70 bg-(--surface)/70 p-3">
                <p className="text-xs uppercase tracking-wide text-(--muted)">
                  Publisher
                </p>
                <p className="mt-1 font-medium">
                  {fallbackText(book.publisher, "Unknown")}
                </p>
              </div>
              <div className="rounded-lg border border-(--border)/70 bg-(--surface)/70 p-3">
                <p className="text-xs uppercase tracking-wide text-(--muted)">
                  Published
                </p>
                <p className="mt-1 font-medium">
                  {fallbackText(book.publishedDate, "Unknown")}
                </p>
              </div>
              <div className="rounded-lg border border-(--border)/70 bg-(--surface)/70 p-3">
                <p className="text-xs uppercase tracking-wide text-(--muted)">
                  Language
                </p>
                <p className="mt-1 font-medium">
                  {fallbackText(book.language?.toUpperCase(), "Unknown")}
                </p>
              </div>
              <div className="rounded-lg border border-(--border)/70 bg-(--surface)/70 p-3">
                <p className="text-xs uppercase tracking-wide text-(--muted)">
                  Pages
                </p>
                <p className="mt-1 font-medium">
                  {book.pageCount ?? "Unknown"}
                </p>
              </div>
              <div className="rounded-lg border border-(--border)/70 bg-(--surface)/70 p-3 sm:col-span-2 xl:col-span-2">
                <p className="text-xs uppercase tracking-wide text-(--muted)">
                  ISBN
                </p>
                <p className="mt-1 font-medium">
                  {book.isbn13 ?? book.isbn10 ?? "Unavailable"}
                </p>
              </div>
            </div>

            {book.categories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {book.categories.map((category) => (
                  <Badge key={category} className="bg-(--surface)/80">
                    {category}
                  </Badge>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Link
                href="/books/search"
                className={buttonStyles({ variant: "secondary" })}
              >
                Back to search
              </Link>
              {book.infoLink ? (
                <a
                  href={book.infoLink}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonStyles({})}
                >
                  View on Google Books
                </a>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-(--border)/90">
        <CardContent className="space-y-5 p-7 sm:p-8">
          <h2 className="text-xl font-semibold">About this book</h2>
          {description ? (
            <div
              className="text-[15px] leading-7 text-(--muted) [&_p]:mb-4 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_em]:italic [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          ) : (
            <p className="text-sm text-(--muted)">
              No description available for this title.
            </p>
          )}
        </CardContent>
      </Card>
    </article>
  );
}

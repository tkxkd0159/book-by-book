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

  return (
    <article className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>Google Volume</Badge>
        <code className="rounded-md bg-[var(--surface)] px-2 py-1 text-xs">
          {book.googleVolumeId}
        </code>
      </div>

      <Card className="border-2">
        <CardContent className="grid gap-6 p-6 md:grid-cols-[160px_1fr]">
          <div className="relative h-56 w-40 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            {book.thumbnailUrl ? (
              <Image
                src={book.thumbnailUrl}
                alt={`${book.title} cover`}
                fill
                sizes="160px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-3 text-center text-xs text-[var(--muted)]">
                No cover image
              </div>
            )}
          </div>

          <div className="space-y-4">
            <header>
              <h1 className="text-3xl font-semibold sm:text-4xl">{book.title}</h1>
              {book.subtitle ? (
                <p className="mt-1 text-lg text-[var(--muted)]">{book.subtitle}</p>
              ) : null}
            </header>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-medium">Authors</dt>
                <dd className="text-[var(--muted)]">
                  {book.authors.length > 0 ? book.authors.join(", ") : "Unknown"}
                </dd>
              </div>
              <div>
                <dt className="font-medium">Publisher</dt>
                <dd className="text-[var(--muted)]">
                  {fallbackText(book.publisher, "Unknown")}
                </dd>
              </div>
              <div>
                <dt className="font-medium">Published</dt>
                <dd className="text-[var(--muted)]">
                  {fallbackText(book.publishedDate, "Unknown")}
                </dd>
              </div>
              <div>
                <dt className="font-medium">Language</dt>
                <dd className="text-[var(--muted)]">
                  {fallbackText(book.language?.toUpperCase(), "Unknown")}
                </dd>
              </div>
              <div>
                <dt className="font-medium">Pages</dt>
                <dd className="text-[var(--muted)]">{book.pageCount ?? "Unknown"}</dd>
              </div>
              <div>
                <dt className="font-medium">ISBN</dt>
                <dd className="text-[var(--muted)]">
                  {book.isbn13 ?? book.isbn10 ?? "Unavailable"}
                </dd>
              </div>
            </dl>

            {book.categories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {book.categories.map((category) => (
                  <Badge key={category}>{category}</Badge>
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

      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="text-xl font-semibold">Description</h2>
          <p className="whitespace-pre-line text-sm text-[var(--muted)]">
            {fallbackText(book.description, "No description available for this title.")}
          </p>
        </CardContent>
      </Card>
    </article>
  );
}

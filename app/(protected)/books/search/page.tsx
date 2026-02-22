import Image from "next/image";
import Link from "next/link";

import { importBookAction } from "@/app/(protected)/books/search/actions";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { searchGoogleBooks } from "@/lib/books/google";
import { findBooksByGoogleVolumeIds } from "@/lib/books/repository";

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const errorMessages: Record<string, string> = {
  "missing-volume-id": "Select a valid book before importing.",
  "book-not-found": "Google Books could not find that volume.",
};

function getParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function BookSearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = getParam(params.q).trim();
  const errorCode = getParam(params.error);
  const errorMessage = errorMessages[errorCode];

  let searchError: string | null = null;
  const results =
    query.length >= 2
      ? await searchGoogleBooks(query).catch((error: unknown) => {
          console.error(error);
          searchError = "Search is temporarily unavailable.";
          return [];
        })
      : [];

  const importedBooks = await findBooksByGoogleVolumeIds(
    results.map((result) => result.googleVolumeId),
  );
  const importedSet = new Set(importedBooks.map((book) => book.googleVolumeId));

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold sm:text-4xl">Search Books</h1>
        <p className="max-w-3xl text-[var(--muted)]">
          Search Google Books by title, author, or ISBN. Importing stores the book in
          local Postgres cache.
        </p>
      </section>

      <form className="rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] p-4 sm:p-6">
        <label htmlFor="q" className="mb-2 block text-sm font-medium">
          Search term
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            id="q"
            name="q"
            defaultValue={query}
            placeholder="e.g. Atomic Habits, Ursula Le Guin, 9780143127741"
            autoComplete="off"
          />
          <Button type="submit" className="sm:w-auto">
            Search
          </Button>
        </div>
      </form>

      {errorMessage ? (
        <p className="rounded-md border border-[#d39e95] bg-[#fff2ef] p-3 text-sm text-[#7e1f14]">
          {errorMessage}
        </p>
      ) : null}

      {searchError ? (
        <p className="rounded-md border border-[#d39e95] bg-[#fff2ef] p-3 text-sm text-[#7e1f14]">
          {searchError}
        </p>
      ) : null}

      {query.length < 2 ? (
        <p className="text-sm text-[var(--muted)]">
          Enter at least 2 characters to start searching.
        </p>
      ) : null}

      {query.length >= 2 && results.length === 0 && !searchError ? (
        <p className="text-sm text-[var(--muted)]">No books matched your query.</p>
      ) : null}

      {results.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {results.map((book) => {
            const isImported = importedSet.has(book.googleVolumeId);

            return (
              <Card key={book.googleVolumeId} className="flex h-full flex-col">
                <CardHeader>
                  <CardTitle className="line-clamp-2 text-xl">{book.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {book.authors.join(", ") || "Unknown author"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex grow gap-4">
                  <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]">
                    {book.thumbnailUrl ? (
                      <Image
                        src={book.thumbnailUrl}
                        alt={`${book.title} cover`}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center p-2 text-center text-xs text-[var(--muted)]">
                        No cover
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 text-sm text-[var(--muted)]">
                    <p>{book.publisher ?? "Unknown publisher"}</p>
                    <p>{book.publishedDate ?? "Unknown publication date"}</p>
                    {isImported ? (
                      <p className="font-medium text-[var(--foreground)]">
                        Already in local cache
                      </p>
                    ) : (
                      <p>Not imported yet</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="justify-between">
                  <Link
                    href={`/books/${encodeURIComponent(book.googleVolumeId)}`}
                    className={buttonStyles({ variant: "secondary", size: "sm" })}
                  >
                    Open
                  </Link>
                  <form action={importBookAction}>
                    <input type="hidden" name="googleVolumeId" value={book.googleVolumeId} />
                    <Button type="submit" size="sm">
                      Import
                    </Button>
                  </form>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

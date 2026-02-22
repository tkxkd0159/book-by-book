import Image from "next/image";
import Link from "next/link";

import { importBookAction } from "@/app/(protected)/books/search/actions";
import { Button, buttonStyles } from "@/components/ui/button";
import {
  Badge,
} from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { searchGoogleBooks } from "@/lib/books/google";
import { findBooksByGoogleVolumeIds } from "@/lib/books/repository";

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

export default async function BookSearchPage({ searchParams }: Props.Page) {
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
  const resultCount = results.length;

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[0_12px_30px_rgba(42,32,18,0.06)] sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[var(--accent)]/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-8 h-44 w-44 rounded-full bg-[#c78d42]/10 blur-2xl" />

        <div className="relative space-y-3">
          <h1 className="text-3xl font-semibold sm:text-4xl">Discover Your Next Book</h1>
          <p className="max-w-3xl text-[var(--muted)]">
            Search by title, author, or ISBN. Importing saves structured metadata to
            your local cache for reliable club, shelf, and review flows.
          </p>
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge className="bg-[var(--surface)]/85">Google Books Source</Badge>
            <Badge className="bg-[var(--surface)]/85">Postgres Cache Ready</Badge>
            {query.length >= 2 ? (
              <Badge className="bg-[var(--surface)]/85">
                {resultCount} result{resultCount === 1 ? "" : "s"}
              </Badge>
            ) : null}
          </div>
        </div>
      </section>

      <form className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4 shadow-[0_6px_20px_rgba(42,32,18,0.04)] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grow">
            <label htmlFor="q" className="mb-2 block text-sm font-medium">
              Search term
            </label>
            <Input
              id="q"
              name="q"
              defaultValue={query}
              placeholder="e.g. Atomic Habits, Ursula Le Guin, 9780143127741"
              autoComplete="off"
            />
          </div>
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
        <p className="text-sm text-[var(--muted)]">
          No books matched your query.
        </p>
      ) : null}

      {results.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {results.map((book) => {
            const isImported = importedSet.has(book.googleVolumeId);
            const authorsText = book.authors.length > 0 ? book.authors.join(", ") : "Unknown author";

            return (
              <Card
                key={book.googleVolumeId}
                className="group relative overflow-hidden border-[var(--border)]/90 bg-[var(--surface-strong)] shadow-[0_10px_24px_rgba(42,32,18,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(42,32,18,0.12)]"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--accent)]/75 via-[#cb8b39]/55 to-[var(--accent)]/75" />

                <CardContent className="flex h-full flex-col gap-4 p-5 pt-6">
                  <div className="grid grid-cols-[92px_1fr] gap-4">
                    <div className="relative aspect-[2/3] w-[92px] overflow-hidden rounded-lg border border-[var(--border)] bg-white/90 p-1 shadow-[0_4px_12px_rgba(42,32,18,0.08)]">
                      {book.thumbnailUrl ? (
                        <Image
                          src={book.thumbnailUrl}
                          alt={`${book.title} cover`}
                          fill
                          sizes="92px"
                          className="object-contain"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-2 text-center text-xs text-[var(--muted)]">
                          Cover unavailable
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h2 className="line-clamp-2 text-lg font-semibold leading-tight">
                        {book.title}
                      </h2>
                      <p className="line-clamp-2 text-sm text-[var(--muted)]">
                        {authorsText}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-white/70">
                          {book.publisher ?? "Unknown publisher"}
                        </Badge>
                        <Badge className="bg-white/70">
                          {book.publishedDate ?? "Unknown date"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-[var(--border)]/70 bg-[var(--surface)]/70 px-3 py-2 text-sm text-[var(--muted)]">
                    {isImported
                      ? "Cached in your local database and ready to open."
                      : "Not cached yet. Import to persist this book locally."}
                  </div>

                  <div className="mt-auto flex items-center gap-2">
                    <Link
                      href={`/books/${encodeURIComponent(book.googleVolumeId)}`}
                      className={buttonStyles({
                        variant: "secondary",
                        size: "sm",
                        className: "flex-1",
                      })}
                    >
                      Details
                    </Link>
                    <form action={importBookAction} className="flex-1">
                      <input
                        type="hidden"
                        name="googleVolumeId"
                        value={book.googleVolumeId}
                      />
                      <Button type="submit" size="sm" className="w-full">
                        Import
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

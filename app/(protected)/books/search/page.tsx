import Image from "next/image";
import Link from "next/link";

import { AddBookToClubsModal } from "@/components/books/add-book-to-clubs-modal";
import { BookSearchForm } from "@/components/books/book-search-form";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/auth/server";
import { summarizeManageableClubBookTargets } from "@/lib/clubs/book-targets";
import {
  GoogleBooksQueryValidationError,
  searchGoogleBooks,
} from "@/lib/books/google";
import { listManageableClubBookTargetsByGoogleVolumeIds } from "@/lib/clubs/repository";
import type { BookSearchMode, BookSearchPage } from "@/lib/books/types";
const SEARCH_PAGE_SIZE = 18;
const advancedFilterKeys = [
  "title",
  "author",
  "publisher",
  "subject",
  "isbn",
] as const;

type AdvancedFilterKey = (typeof advancedFilterKeys)[number];
type AdvancedFilters = Record<AdvancedFilterKey, string>;

function getParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function parsePage(value: string | string[] | undefined) {
  const parsed = Number.parseInt(getParam(value), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function parseBooleanParam(value: string | string[] | undefined) {
  const values = Array.isArray(value) ? value : [value ?? ""];
  return values.some(
    (item) => item === "1" || item === "true" || item === "on",
  );
}

function readMessage(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function readAdvancedFilters(
  params: Record<string, string | string[] | undefined>,
): AdvancedFilters {
  return {
    title: getParam(params.title).trim(),
    author: getParam(params.author).trim(),
    publisher: getParam(params.publisher).trim(),
    subject: getParam(params.subject).trim(),
    isbn: getParam(params.isbn).trim(),
  };
}

function hasAnyAdvancedFilter(filters: AdvancedFilters) {
  return advancedFilterKeys.some((key) => filters[key].length > 0);
}

function normalizeAdvancedTerm(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return "";
  }

  if (!/\s/.test(normalized)) {
    return normalized;
  }

  return `"${normalized.replace(/"/g, '\\"')}"`;
}

function buildAdvancedSearchQuery(filters: AdvancedFilters) {
  const terms: string[] = [];

  if (filters.title) {
    terms.push(`intitle:${normalizeAdvancedTerm(filters.title)}`);
  }
  if (filters.author) {
    terms.push(`inauthor:${normalizeAdvancedTerm(filters.author)}`);
  }
  if (filters.publisher) {
    terms.push(`inpublisher:${normalizeAdvancedTerm(filters.publisher)}`);
  }
  if (filters.subject) {
    terms.push(`subject:${normalizeAdvancedTerm(filters.subject)}`);
  }
  if (filters.isbn) {
    terms.push(`isbn:${normalizeAdvancedTerm(filters.isbn)}`);
  }

  return terms.join(" ");
}

function createSearchHref(
  page: number,
  searchMode: BookSearchMode,
  basicQuery: string,
  titleOnly: boolean,
  advancedFilters: AdvancedFilters,
) {
  const params = new URLSearchParams();

  if (searchMode === "advanced") {
    params.set("advanced", "1");
    for (const key of advancedFilterKeys) {
      if (advancedFilters[key]) {
        params.set(key, advancedFilters[key]);
      }
    }
  } else {
    if (basicQuery) {
      params.set("q", basicQuery);
    }
    if (titleOnly && basicQuery) {
      params.set("titleOnly", "1");
    }
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();
  if (!queryString) {
    return "/books/search";
  }

  return `/books/search?${queryString}`;
}

function createEmptySearchResult(
  page: number,
  pageSize: number,
  mode: BookSearchMode,
): BookSearchPage {
  return {
    items: [],
    mode,
    page,
    pageSize,
    totalItems: null,
    totalPages: null,
    hasPreviousPage: page > 1,
    hasNextPage: false,
  };
}

export default async function BookSearchPage({ searchParams }: Props.Page) {
  const currentUser = await requireCurrentUser();
  const params = await searchParams;
  const basicQuery = getParam(params.q).trim();
  const titleOnly = parseBooleanParam(params.titleOnly);
  const advancedRequested = parseBooleanParam(params.advanced);
  const advancedFilters = readAdvancedFilters(params);
  const hasAdvancedFilters = hasAnyAdvancedFilter(advancedFilters);
  const isAdvancedOpen = advancedRequested || hasAdvancedFilters;
  const searchMode: BookSearchMode = isAdvancedOpen ? "advanced" : "basic";
  const searchQuery =
    searchMode === "advanced" ? buildAdvancedSearchQuery(advancedFilters) : basicQuery;
  const shouldSearch =
    searchMode === "advanced" ? hasAdvancedFilters : basicQuery.length >= 2;

  const requestedPage = parsePage(params.page);
  const message = readMessage(params.message);
  const actionError = readMessage(params.error);

  let searchError: string | null = null;
  const searchResult = shouldSearch
    ? await searchGoogleBooks(searchQuery, {
        page: requestedPage,
        pageSize: SEARCH_PAGE_SIZE,
        mode: searchMode,
        titleOnly,
      }).catch((error: unknown) => {
        console.error(error);
        searchError =
          error instanceof GoogleBooksQueryValidationError
            ? error.message
            : "Search is temporarily unavailable.";
        return createEmptySearchResult(
          requestedPage,
          SEARCH_PAGE_SIZE,
          searchMode,
        );
      })
    : createEmptySearchResult(1, SEARCH_PAGE_SIZE, searchMode);

  const results = searchResult.items;
  const hasPagination =
    shouldSearch &&
    !searchError &&
    (searchResult.hasPreviousPage || searchResult.hasNextPage);
  const resultStart =
    results.length > 0
      ? (searchResult.page - 1) * searchResult.pageSize + 1
      : 0;
  const resultEnd = results.length > 0 ? resultStart + results.length - 1 : 0;

  const prevPageHref = createSearchHref(
    Math.max(1, searchResult.page - 1),
    searchMode,
    basicQuery,
    titleOnly,
    advancedFilters,
  );
  const nextPageHref = createSearchHref(
    searchResult.page + 1,
    searchMode,
    basicQuery,
    titleOnly,
    advancedFilters,
  );
  const currentSearchHref = createSearchHref(
    searchResult.page,
    searchMode,
    basicQuery,
    titleOnly,
    advancedFilters,
  );

  const clubTargetsByVolumeId = await listManageableClubBookTargetsByGoogleVolumeIds(
    currentUser.id,
    results.map((result) => result.googleVolumeId),
  );
  const resultCount = searchResult.totalItems;

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-2xl border border-(--border) bg-(--surface-strong) p-6 shadow-[0_12px_30px_rgba(42,32,18,0.06)] sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-(--accent)/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-8 h-44 w-44 rounded-full bg-[#c78d42]/10 blur-2xl" />

        <div className="relative space-y-3">
          <h1 className="text-3xl font-semibold sm:text-4xl">
            Discover Your Next Book
          </h1>
          <p className="max-w-3xl text-(--muted)">
            Use quick term search by default, optionally toggle title-only
            matching, or expand advanced filters for precise queries.
          </p>
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge className="bg-(--surface)/85">Google Books Source</Badge>
            <Badge className="bg-(--surface)/85">Postgres Cache Ready</Badge>
            {shouldSearch ? (
              <Badge className="bg-(--surface)/85">
                {resultCount === null
                  ? "Total count unavailable"
                  : `${resultCount} total result${resultCount === 1 ? "" : "s"}`}
              </Badge>
            ) : null}
            {searchMode === "advanced" ? (
              <Badge className="bg-(--surface)/85">Advanced filters</Badge>
            ) : null}
            {searchMode === "basic" && titleOnly ? (
              <Badge className="bg-(--surface)/85">Title-only match</Badge>
            ) : null}
            {hasPagination ? (
              <Badge className="bg-(--surface)/85">
                Page {searchResult.page}
                {searchResult.totalPages !== null
                  ? ` / ${searchResult.totalPages}`
                  : ""}
              </Badge>
            ) : null}
          </div>
        </div>
      </section>

      <BookSearchForm
        basicQuery={basicQuery}
        titleOnly={titleOnly}
        advancedFilters={advancedFilters}
        isAdvancedOpen={isAdvancedOpen}
      />

      {message ? (
        <p className="rounded-md border border-[#b9d6cf] bg-[#eef9f5] p-3 text-sm text-[#125547]">
          {message}
        </p>
      ) : null}

      {actionError ? (
        <p className="rounded-md border border-[#d39e95] bg-[#fff2ef] p-3 text-sm text-[#7e1f14]">
          {actionError}
        </p>
      ) : null}

      {searchError ? (
        <p className="rounded-md border border-[#d39e95] bg-[#fff2ef] p-3 text-sm text-[#7e1f14]">
          {searchError}
        </p>
      ) : null}

      {!shouldSearch ? (
        <p className="text-sm text-(--muted)">
          {searchMode === "advanced"
            ? "Fill at least one advanced field to start searching."
            : "Enter at least 2 characters to start searching."}
        </p>
      ) : null}

      {shouldSearch && results.length === 0 && !searchError ? (
        <p className="text-sm text-(--muted)">No books matched your query.</p>
      ) : null}

      {hasPagination ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-(--border) bg-(--surface-strong) px-4 py-3 text-sm">
          <p className="text-(--muted)">
            {searchResult.totalItems === null
              ? `Showing ${resultStart}-${resultEnd} (total unavailable)`
              : `Showing ${resultStart}-${resultEnd} of ${searchResult.totalItems}`}
          </p>
          <div className="flex items-center gap-2">
            {searchResult.hasPreviousPage ? (
              <Link
                href={prevPageHref}
                className={buttonStyles({ variant: "secondary", size: "sm" })}
              >
                Previous
              </Link>
            ) : (
              <span
                className={buttonStyles({
                  variant: "secondary",
                  size: "sm",
                  className: "pointer-events-none opacity-50",
                })}
              >
                Previous
              </span>
            )}
            {searchResult.hasNextPage ? (
              <Link
                href={nextPageHref}
                className={buttonStyles({ size: "sm" })}
              >
                Next
              </Link>
            ) : (
              <span
                className={buttonStyles({
                  size: "sm",
                  className: "pointer-events-none opacity-50",
                })}
              >
                Next
              </span>
            )}
          </div>
        </section>
      ) : null}

      {results.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {results.map((book) => {
            const clubTargets = clubTargetsByVolumeId[book.googleVolumeId] ?? [];
            const addSummary = summarizeManageableClubBookTargets(clubTargets);
            const authorsText =
              book.authors.length > 0
                ? book.authors.join(", ")
                : "Unknown author";
            const availabilityText =
              addSummary.state === "no-manageable-clubs"
                ? "Create or manage a club before adding this book."
                : addSummary.state === "all-already-added"
                  ? "Already added to every club you manage."
                  : addSummary.alreadyAddedCount > 0
                    ? `Already added to ${addSummary.alreadyAddedCount} club${addSummary.alreadyAddedCount === 1 ? "" : "s"}. You can add it to ${addSummary.addableCount} more.`
                    : `Ready to add to ${addSummary.addableCount} club${addSummary.addableCount === 1 ? "" : "s"}.`;

            return (
              <Card
                key={book.googleVolumeId}
                className="group relative overflow-hidden border-(--border)/90 bg-(--surface-strong) shadow-[0_10px_24px_rgba(42,32,18,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(42,32,18,0.12)]"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-(--accent)/75 via-[#cb8b39]/55 to-(--accent)/75" />

                <CardContent className="flex h-full flex-col gap-4 p-5 pt-6">
                  <div className="grid grid-cols-[92px_1fr] gap-4">
                    <div className="relative aspect-2/3 w-23 overflow-hidden rounded-lg border border-(--border) bg-white/90 p-1 shadow-[0_4px_12px_rgba(42,32,18,0.08)]">
                      {book.thumbnailUrl ? (
                        <Image
                          src={book.thumbnailUrl}
                          alt={`${book.title} cover`}
                          fill
                          sizes="92px"
                          className="object-contain"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-2 text-center text-xs text-(--muted)">
                          Cover unavailable
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h2 className="line-clamp-2 text-lg font-semibold leading-tight">
                        {book.title}
                      </h2>
                      <p className="line-clamp-2 text-sm text-(--muted)">
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

                  <div className="rounded-lg border border-(--border)/70 bg-(--surface)/70 px-3 py-2 text-sm text-(--muted)">
                    {availabilityText}
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
                    <AddBookToClubsModal
                      googleVolumeId={book.googleVolumeId}
                      bookTitle={book.title}
                      clubTargets={clubTargets}
                      returnTo={currentSearchHref}
                      triggerClassName="flex-1"
                    />
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

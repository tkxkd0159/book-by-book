"use client";

import { useState } from "react";

import { Button, buttonStyles } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AdvancedFilters = {
  title: string;
  author: string;
  publisher: string;
  subject: string;
  isbn: string;
};

type BookSearchFormProps = {
  basicQuery: string;
  useSearchTerm: boolean;
  advancedFilters: AdvancedFilters;
  isAdvancedOpen: boolean;
};

export function BookSearchForm({
  basicQuery,
  useSearchTerm,
  advancedFilters,
  isAdvancedOpen,
}: BookSearchFormProps) {
  const [advancedOpen, setAdvancedOpen] = useState(isAdvancedOpen);
  const [basicQueryValue, setBasicQueryValue] = useState(basicQuery);
  const [useSearchTermEnabled, setUseSearchTermEnabled] =
    useState(useSearchTerm);
  const [advancedValues, setAdvancedValues] = useState(advancedFilters);

  function setAdvancedValue(key: keyof AdvancedFilters, value: string) {
    setAdvancedValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <form
      action="/books/search"
      className="book-search-form space-y-4 rounded-2xl border border-(--border) bg-(--surface-strong) p-4 shadow-[0_6px_20px_rgba(42,32,18,0.04)] sm:p-6"
    >
      <div className="rounded-xl border border-(--border)/80 bg-(--surface)/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className={buttonStyles({
              variant: "secondary",
              size: "sm",
              className: cn(
                "book-search-advanced-trigger w-fit",
                advancedOpen && "book-search-advanced-trigger-active",
              ),
            })}
            aria-controls="advanced-search-fields"
            aria-expanded={advancedOpen}
            onClick={() => {
              setAdvancedOpen((prev) => !prev);
            }}
          >
            Advanced search
          </button>
          <p className="text-xs text-(--muted)">
            {advancedOpen ? "Advanced mode enabled" : "Quick mode enabled"}
          </p>
        </div>

        {advancedOpen ? (
          <>
            <input type="hidden" name="advanced" value="1" />

            <div
              id="advanced-search-fields"
              className="mt-4 grid gap-3 sm:grid-cols-2"
            >
              <div className="sm:col-span-2">
                <label
                  htmlFor="title"
                  className="mb-2 block text-sm font-medium"
                >
                  Title
                </label>
                <Input
                  id="title"
                  name="title"
                  value={advancedValues.title}
                  onChange={(event) => {
                    setAdvancedValue("title", event.currentTarget.value);
                  }}
                  placeholder="e.g. Pride and Prejudice"
                  autoComplete="off"
                />
              </div>

              <div>
                <label
                  htmlFor="author"
                  className="mb-2 block text-sm font-medium"
                >
                  Author
                </label>
                <Input
                  id="author"
                  name="author"
                  value={advancedValues.author}
                  onChange={(event) => {
                    setAdvancedValue("author", event.currentTarget.value);
                  }}
                  placeholder="e.g. Jane Austen"
                  autoComplete="off"
                />
              </div>

              <div>
                <label
                  htmlFor="publisher"
                  className="mb-2 block text-sm font-medium"
                >
                  Publisher
                </label>
                <Input
                  id="publisher"
                  name="publisher"
                  value={advancedValues.publisher}
                  onChange={(event) => {
                    setAdvancedValue("publisher", event.currentTarget.value);
                  }}
                  placeholder="e.g. Penguin"
                  autoComplete="off"
                />
              </div>

              <div>
                <label
                  htmlFor="subject"
                  className="mb-2 block text-sm font-medium"
                >
                  Subject
                </label>
                <Input
                  id="subject"
                  name="subject"
                  value={advancedValues.subject}
                  onChange={(event) => {
                    setAdvancedValue("subject", event.currentTarget.value);
                  }}
                  placeholder="e.g. Classic literature"
                  autoComplete="off"
                />
              </div>

              <div>
                <label
                  htmlFor="isbn"
                  className="mb-2 block text-sm font-medium"
                >
                  ISBN
                </label>
                <Input
                  id="isbn"
                  name="isbn"
                  value={advancedValues.isbn}
                  onChange={(event) => {
                    setAdvancedValue("isbn", event.currentTarget.value);
                  }}
                  placeholder="e.g. 9780141439518"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                type="submit"
                className="h-11 w-full sm:w-auto sm:shrink-0"
              >
                Search
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="grow space-y-3">
                <label htmlFor="q" className="block text-sm font-medium">
                  Search term
                </label>
                <Input
                  id="q"
                  name="q"
                  value={basicQueryValue}
                  onChange={(event) => {
                    setBasicQueryValue(event.currentTarget.value);
                  }}
                  placeholder={
                    useSearchTermEnabled
                      ? 'e.g. "Elizabeth+Bennet"+Darcy-Austen'
                      : "e.g. Harry Potter"
                  }
                  autoComplete="off"
                />
              </div>

              <Button type="submit" className="h-11 sm:w-auto sm:shrink-0">
                Search
              </Button>
            </div>

            <label className="mt-3 inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                name="useSearchTerm"
                value="1"
                checked={useSearchTermEnabled}
                onChange={(event) => {
                  setUseSearchTermEnabled(event.currentTarget.checked);
                }}
                className="peer sr-only"
              />
              <span className="relative h-6 w-11 rounded-full bg-(--border) transition-colors peer-checked:bg-(--accent)">
                <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
              </span>
              <span className="text-sm text-(--muted)">
                Use raw search term
              </span>
            </label>
          </>
        )}
      </div>
    </form>
  );
}

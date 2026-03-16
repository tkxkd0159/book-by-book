import { ArrowLeft, ArrowRight } from "lucide-react";
import type { PaginatedResult, ThreadSummary } from "@/lib/threads/repository";

import { ThreadCard } from "@/components/threads/thread-card";
import { buttonStyles } from "@/components/ui/button";
import { createDiscussionPageHref } from "@/lib/threads/presentation";
import Link from "next/link";

type ClubBookThreadListProps = {
  clubId: string;
  clubBookId: string;
  basePath: string;
  canManagePins: boolean;
  threads: PaginatedResult<ThreadSummary>;
  archived: boolean;
};

export function ClubBookThreadList({
  clubId,
  clubBookId,
  basePath,
  canManagePins,
  threads,
  archived,
}: ClubBookThreadListProps) {
  if (threads.items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-(--border) bg-(--surface) p-5 text-sm text-(--muted)">
        {archived
          ? "This book is archived and has no saved discussion threads."
          : "No threads yet. Start the first conversation for this club book."}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5">
        {threads.items.map((thread) => (
          <ThreadCard
            key={thread.id}
            clubId={clubId}
            clubBookId={clubBookId}
            canManagePins={canManagePins}
            returnTo={createDiscussionPageHref(basePath, threads.page)}
            thread={thread}
          />
        ))}
      </div>

      {threads.hasPreviousPage || threads.hasNextPage ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-(--border) bg-(--surface) px-4 py-3 text-sm text-(--muted)">
          <span>
            Page {threads.page} of {threads.totalPages}
          </span>
          <div className="flex gap-2">
            {threads.hasPreviousPage ? (
              <Link
                href={createDiscussionPageHref(basePath, threads.page - 1)}
                className={buttonStyles({ variant: "secondary", size: "sm" })}
              >
                <ArrowLeft aria-hidden className="h-4 w-4 shrink-0" />
                Previous
              </Link>
            ) : null}
            {threads.hasNextPage ? (
              <Link
                href={createDiscussionPageHref(basePath, threads.page + 1)}
                className={buttonStyles({ variant: "secondary", size: "sm" })}
              >
                Next
                <ArrowRight aria-hidden className="h-4 w-4 shrink-0" />
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

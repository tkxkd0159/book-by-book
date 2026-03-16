import type { PaginatedResult, ThreadSummary } from "@/lib/threads/repository";

import { ThreadCard } from "@/components/threads/thread-card";
import { buttonStyles } from "@/components/ui/button";
import Link from "next/link";

type ClubBookThreadListProps = {
  clubId: string;
  basePath: string;
  threads: PaginatedResult<ThreadSummary>;
  archived: boolean;
};

function createPageHref(basePath: string, page: number) {
  if (page <= 1) {
    return basePath;
  }

  return `${basePath}?page=${page}`;
}

export function ClubBookThreadList({
  clubId,
  basePath,
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
    <div className="space-y-4">
      <div className="grid gap-4">
        {threads.items.map((thread) => (
          <ThreadCard key={thread.id} clubId={clubId} thread={thread} />
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
                href={createPageHref(basePath, threads.page - 1)}
                className={buttonStyles({ variant: "secondary", size: "sm" })}
              >
                Previous
              </Link>
            ) : null}
            {threads.hasNextPage ? (
              <Link
                href={createPageHref(basePath, threads.page + 1)}
                className={buttonStyles({ variant: "secondary", size: "sm" })}
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

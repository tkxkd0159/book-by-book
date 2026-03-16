import Link from "next/link";

import { PinThreadButton } from "@/components/threads/pin-thread-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buildThreadExcerpt } from "@/lib/threads/presentation";
import type { ThreadSummary } from "@/lib/threads/repository";

type ThreadCardProps = {
  clubId: string;
  clubBookId: string;
  canManagePins: boolean;
  returnTo: string;
  thread: ThreadSummary;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function ThreadCard({
  clubId,
  clubBookId,
  canManagePins,
  returnTo,
  thread,
}: ThreadCardProps) {
  const excerpt = buildThreadExcerpt(thread.body);
  const authorName = thread.author.name?.trim() || "Unknown reader";

  return (
    <Card className="border-(--border)/80 bg-(--surface)">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {thread.isPinned ? <Badge>Pinned</Badge> : null}
            <Badge className="bg-(--surface-strong)">
              {thread.postCount} repl{thread.postCount === 1 ? "y" : "ies"}
            </Badge>
          </div>

          {canManagePins ? (
            <PinThreadButton
              clubId={clubId}
              clubBookId={clubBookId}
              threadId={thread.id}
              isPinned={thread.isPinned}
              returnTo={returnTo}
            />
          ) : null}
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold leading-tight">
            <Link
              href={`/clubs/${clubId}/threads/${thread.id}`}
              className="hover:underline"
            >
              {thread.title}
            </Link>
          </h3>
          {excerpt ? (
            <p className="text-sm leading-6 text-(--muted)">{excerpt}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-(--muted)">
          <span>{authorName}</span>
          <span>Started {formatDate(thread.createdAt)}</span>
          {thread.updatedAt.getTime() !== thread.createdAt.getTime() ? (
            <span>Updated {formatDate(thread.updatedAt)}</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

import { Pin } from "lucide-react";
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
    <Card
      id={`thread-${thread.id}`}
      className="group relative scroll-mt-28 overflow-hidden border-2 border-(--border)/85 bg-(--surface) transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(42,32,18,0.12)] focus-within:-translate-y-1 focus-within:shadow-[0_18px_34px_rgba(42,32,18,0.12)] sm:scroll-mt-32"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-(--accent)/70 via-[#cb8b39]/50 to-(--accent)/70" />
      <Link
        href={`/clubs/${clubId}/threads/${thread.id}`}
        aria-label={`Open thread ${thread.title}`}
        className="absolute inset-0 z-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-soft) focus-visible:ring-offset-2 focus-visible:ring-offset-(--surface-strong)"
      />

      <CardContent className="relative z-10 space-y-5 p-5 pt-5 pointer-events-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="pointer-events-none flex flex-wrap items-center gap-2">
            {thread.isPinned ? (
              <Badge variant="accent">
                <Pin aria-hidden className="h-3.5 w-3.5 shrink-0" />
                Pinned
              </Badge>
            ) : null}
            <Badge variant="neutral">
              {thread.postCount} comment{thread.postCount === 1 ? "" : "s"}
            </Badge>
          </div>

          {canManagePins ? (
            <div className="pointer-events-auto">
              <PinThreadButton
                clubId={clubId}
                clubBookId={clubBookId}
                threadId={thread.id}
                isPinned={thread.isPinned}
                returnTo={returnTo}
              />
            </div>
          ) : null}
        </div>

        <div className="pointer-events-none space-y-3">
          <h3 className="text-xl font-semibold leading-tight transition-transform duration-200 group-hover:translate-x-0.5 group-focus-within:translate-x-0.5 sm:text-2xl">
            {thread.title}
          </h3>
          {excerpt ? (
            <p className="max-w-3xl text-sm leading-6 text-(--muted)">
              {excerpt}
            </p>
          ) : null}
        </div>

        <div className="pointer-events-none flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-(--muted)">
          <span className="font-medium text-foreground/90">{authorName}</span>
          <span>Started {formatDate(thread.createdAt)}</span>
          {thread.updatedAt.getTime() !== thread.createdAt.getTime() ? (
            <span>Updated {formatDate(thread.updatedAt)}</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

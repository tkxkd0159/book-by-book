import Link from "next/link";

import { ClubCard } from "@/components/clubs/club-card";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { FlashToast } from "@/components/ui/flash-toast";
import { requireCurrentUser } from "@/lib/auth/server";
import {
  listDiscoverablePublicClubs,
  listUserClubs,
} from "@/lib/clubs/repository";

function readMessage(
  value: string | string[] | undefined,
  fallback: string | null = null,
) {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

export default async function ClubsPage({ searchParams }: Props.Page) {
  const currentUser = await requireCurrentUser();

  const [myClubs, discoverClubs, params] = await Promise.all([
    listUserClubs(currentUser.id),
    listDiscoverablePublicClubs(currentUser.id),
    searchParams,
  ]);

  const message = readMessage(params.message);
  const error = readMessage(params.error);

  return (
    <div className="space-y-8">
      <FlashToast
        key={`${message ?? ""}:${error ?? ""}`}
        message={message}
        error={error}
      />

      <section className="flex flex-col gap-4 rounded-2xl border border-(--border) bg-(--surface-strong) p-6 shadow-[0_12px_30px_rgba(42,32,18,0.06)] sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Badge className="bg-(--surface)/85">Milestone 2</Badge>
          <h1 className="text-3xl font-semibold sm:text-4xl">Book Clubs</h1>
          <p className="max-w-3xl text-(--muted)">
            Create reading groups, organize shared books into sections, and
            invite people into private clubs.
          </p>
        </div>

        <Link href="/clubs/new" className={buttonStyles({ size: "lg" })}>
          Create club
        </Link>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">My Clubs</h2>
          <p className="text-sm text-(--muted)">
            Clubs where you are already a member.
          </p>
        </div>

        {myClubs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-(--border) bg-(--surface) p-6 text-sm text-(--muted)">
            You have not joined any clubs yet.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {myClubs.map((club) => (
              <ClubCard key={club.id} club={club} returnTo="/clubs" />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Discover Public Clubs</h2>
          <p className="text-sm text-(--muted)">
            Browse clubs that allow immediate join.
          </p>
        </div>

        {discoverClubs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-(--border) bg-(--surface) p-6 text-sm text-(--muted)">
            No public clubs are waiting for you right now.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {discoverClubs.map((club) => (
              <ClubCard key={club.id} club={club} returnTo="/clubs" />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import { ArrowLeft, UserPlus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { joinClubAction } from "@/app/(protected)/clubs/actions";
import { ClubSectionBoard } from "@/components/clubs/club-section-board";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { canJoinClub, canViewClub, isClubAdmin } from "@/lib/clubs/permissions";
import {
  CLUB_MEMBER_COUNT_BADGE_VARIANT,
  CLUB_ROLE_BADGE_VARIANTS,
  CLUB_VISIBILITY_BADGE_VARIANTS,
  CLUB_VISIBILITY_LABELS,
} from "@/lib/clubs/presentation";
import { getCurrentUser } from "@/lib/auth/server";
import { findClubDetail, listClubBooks } from "@/lib/clubs/repository";

type ClubPageProps = {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readMessage(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function ClubDetailPage({
  params,
  searchParams,
}: ClubPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return null;
  }

  const [{ clubId }, paramsData] = await Promise.all([params, searchParams]);
  const [club, books] = await Promise.all([
    findClubDetail(clubId, currentUser.id),
    listClubBooks(clubId),
  ]);

  if (!club || !canViewClub(club.visibility, club.currentUserRole)) {
    notFound();
  }

  const canManage = isClubAdmin(club.currentUserRole);
  const message = readMessage(paramsData.message);
  const error = readMessage(paramsData.error);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-(--border) bg-(--surface-strong) p-6 shadow-[0_12px_30px_rgba(42,32,18,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant={CLUB_VISIBILITY_BADGE_VARIANTS[club.visibility]}>
                {CLUB_VISIBILITY_LABELS[club.visibility]}
              </Badge>
              <Badge variant={CLUB_MEMBER_COUNT_BADGE_VARIANT}>
                {club.memberCount} member{club.memberCount === 1 ? "" : "s"}
              </Badge>
              {club.currentUserRole ? (
                <Badge variant={CLUB_ROLE_BADGE_VARIANTS[club.currentUserRole]}>
                  {club.currentUserRole}
                </Badge>
              ) : null}
            </div>
            <h1 className="text-3xl font-semibold sm:text-4xl">{club.name}</h1>
            <p className="max-w-3xl text-(--muted)">
              {club.description ?? "No club description yet."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/clubs" className={buttonStyles({ variant: "secondary" })}>
              <ArrowLeft aria-hidden className="h-4 w-4 shrink-0" />
              Back to clubs
            </Link>
            {canManage ? (
              <Link href={`/clubs/${club.id}/invite`} className={buttonStyles({})}>
                Manage invites
              </Link>
            ) : null}
            {canJoinClub(club.visibility, club.currentUserRole) ? (
              <form action={joinClubAction}>
                <input type="hidden" name="clubId" value={club.id} />
                <input type="hidden" name="returnTo" value={`/clubs/${club.id}`} />
                <button type="submit" className={buttonStyles({})}>
                  <UserPlus aria-hidden className="h-4 w-4 shrink-0" />
                  Join club
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </section>

      {message ? (
        <p className="rounded-xl border border-[#b9d6cf] bg-[#eef9f5] px-4 py-3 text-sm text-[#125547]">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-[#d39e95] bg-[#fff2ef] px-4 py-3 text-sm text-[#7e1f14]">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Reading board</h2>
          <p className="text-sm text-(--muted)">
            Shared books move through the club&apos;s reading pipeline.
          </p>
        </div>

        <ClubSectionBoard clubId={club.id} books={books} canManage={canManage} />
      </section>
    </div>
  );
}

import type { ReactNode } from "react";

import { ClubOverviewActions } from "@/components/clubs/club-overview-actions";
import { ClubOverviewTabs } from "@/components/clubs/club-overview-tabs";
import { Badge } from "@/components/ui/badge";
import { isClubMember } from "@/lib/clubs/permissions";
import {
  CLUB_MEMBER_COUNT_BADGE_VARIANT,
  CLUB_ROLE_BADGE_VARIANTS,
  CLUB_VISIBILITY_BADGE_VARIANTS,
  CLUB_VISIBILITY_LABELS,
} from "@/lib/clubs/presentation";

import { loadClubOverviewContext } from "./_lib";

type ClubOverviewLayoutProps = {
  children: ReactNode;
  params: Promise<{ clubId: string }>;
};

export default async function ClubOverviewLayout({
  children,
  params,
}: ClubOverviewLayoutProps) {
  const { clubId } = await params;
  const context = await loadClubOverviewContext(clubId);

  if (!context) {
    return null;
  }

  const { club } = context;

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

          <ClubOverviewActions
            clubId={club.id}
            currentUserRole={club.currentUserRole}
            visibility={club.visibility}
          />
        </div>
      </section>

      <nav
        aria-label="Club sections"
        className="rounded-2xl border border-(--border) bg-(--surface) p-2 shadow-[0_10px_24px_rgba(42,32,18,0.04)]"
      >
        <ClubOverviewTabs
          clubId={club.id}
          showMembers={isClubMember(club.currentUserRole)}
        />
      </nav>

      {children}
    </div>
  );
}

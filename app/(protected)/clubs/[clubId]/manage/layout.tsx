import Link from "next/link";
import type { ReactNode } from "react";

import { DeleteClubButton } from "@/components/clubs/delete-club-button";
import { ManageTabs } from "@/components/clubs/manage-tabs";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isClubOwner } from "@/lib/clubs/permissions";
import { createClubEntryHref } from "@/lib/clubs/view-paths";
import {
  CLUB_MEMBER_COUNT_BADGE_VARIANT,
  CLUB_ROLE_BADGE_VARIANTS,
  CLUB_VISIBILITY_BADGE_VARIANTS,
  CLUB_VISIBILITY_LABELS,
} from "@/lib/clubs/presentation";

import { loadManageClubContext } from "./_lib";

type ClubManageLayoutProps = {
  children: ReactNode;
  params: Promise<{ clubId: string }>;
};

export default async function ClubManageLayout({
  children,
  params,
}: ClubManageLayoutProps) {
  const { clubId } = await params;
  const context = await loadManageClubContext(clubId);

  if (!context) {
    return null;
  }

  const { club } = context;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
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
            <h1 className="text-3xl font-semibold sm:text-4xl">
              Manage {club.name}
            </h1>
            <p className="max-w-3xl text-(--muted)">
              Keep club operations tidy from one place: members, private invites,
              and reading board organization all live here.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={createClubEntryHref(club.id)}
              className={buttonStyles({ variant: "secondary" })}
            >
              Back to club
            </Link>
          </div>
        </div>
      </section>

      <nav
        aria-label="Manage sections"
        className="rounded-2xl border border-(--border) bg-(--surface) p-2 shadow-[0_10px_24px_rgba(42,32,18,0.04)]"
      >
        <ManageTabs
          clubId={club.id}
          showInvite={club.visibility === "PRIVATE"}
        />
      </nav>

      {children}

      {isClubOwner(club.currentUserRole) ? (
        <section className="space-y-4 rounded-2xl border border-[#d39e95] bg-[#fff7f5] p-5 shadow-[0_12px_28px_rgba(42,32,18,0.05)] sm:p-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-[#7e1f14]">
              Danger zone
            </h2>
            <p className="max-w-2xl text-sm text-[#7e1f14]">
              Hand over the owner role before you leave if the club should stay
              active. Delete the club only when you want to close the chapter
              for everyone.
            </p>
          </div>

          <Card className="border-[#d39e95] bg-white/70">
            <CardContent className="flex flex-col gap-4 p-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-[#7e1f14]">
                  Delete club
                </h3>
                <p className="max-w-2xl text-sm text-[#7e1f14]">
                  Permanently delete the club, including invites, reading board
                  updates, and discussions.
                </p>
              </div>

              <DeleteClubButton clubId={club.id} clubName={club.name} />
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}

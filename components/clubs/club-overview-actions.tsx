"use client";

import { UserPlus } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import {
  joinClubAction,
  leaveClubAction,
} from "@/app/(protected)/clubs/actions";
import { buttonStyles } from "@/components/ui/button";
import { createManageEntryHref } from "@/lib/clubs/manage-paths";
import {
  canJoinClub,
  canLeaveClub,
  isClubAdmin,
} from "@/lib/clubs/permissions";
import type { ClubMemberRole, ClubVisibility } from "@/types/db";

type ClubOverviewActionsProps = {
  clubId: string;
  currentUserRole: ClubMemberRole | null;
  visibility: ClubVisibility;
};

export function ClubOverviewActions({
  clubId,
  currentUserRole,
  visibility,
}: ClubOverviewActionsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const returnTo = query ? `${pathname}?${query}` : pathname;

  return (
    <div className="flex flex-wrap gap-2">
      {isClubAdmin(currentUserRole) ? (
        <Link href={createManageEntryHref(clubId)} className={buttonStyles({})}>
          Manage
        </Link>
      ) : null}
      {canLeaveClub(currentUserRole) ? (
        <form action={leaveClubAction}>
          <input type="hidden" name="clubId" value={clubId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <button
            type="submit"
            className={buttonStyles({ variant: "destructive" })}
          >
            Leave club
          </button>
        </form>
      ) : null}
      {canJoinClub(visibility, currentUserRole) ? (
        <form action={joinClubAction}>
          <input type="hidden" name="clubId" value={clubId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <button type="submit" className={buttonStyles({})}>
            <UserPlus aria-hidden className="h-4 w-4 shrink-0" />
            Join club
          </button>
        </form>
      ) : null}
    </div>
  );
}

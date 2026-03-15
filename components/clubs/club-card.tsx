import Link from "next/link";

import { joinClubAction } from "@/app/(protected)/clubs/actions";
import { CLUB_VISIBILITY_LABELS } from "@/lib/clubs/presentation";
import type { ClubSummary } from "@/lib/clubs/repository";
import { canJoinClub } from "@/lib/clubs/permissions";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ClubCardProps = {
  club: ClubSummary;
  returnTo: string;
};

export function ClubCard({ club, returnTo }: ClubCardProps) {
  return (
    <Card className="border-2">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-(--surface)/85">
            {CLUB_VISIBILITY_LABELS[club.visibility]}
          </Badge>
          <Badge className="bg-(--surface)/85">
            {club.memberCount} member{club.memberCount === 1 ? "" : "s"}
          </Badge>
          {club.currentUserRole ? (
            <Badge>{club.currentUserRole}</Badge>
          ) : null}
        </div>
        <CardTitle className="text-2xl">
          <Link href={`/clubs/${club.id}`} className="hover:underline">
            {club.name}
          </Link>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-(--muted)">
          {club.description ?? "No club description yet."}
        </p>

        <div className="flex flex-wrap gap-2">
          <Link href={`/clubs/${club.id}`} className={buttonStyles({ variant: "secondary" })}>
            Open club
          </Link>
          {canJoinClub(club.visibility, club.currentUserRole) ? (
            <form action={joinClubAction}>
              <input type="hidden" name="clubId" value={club.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <button className={buttonStyles({})} type="submit">
                Join club
              </button>
            </form>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

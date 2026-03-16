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
    <Card className="group relative overflow-hidden border-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(42,32,18,0.12)] focus-within:-translate-y-1 focus-within:shadow-[0_18px_34px_rgba(42,32,18,0.12)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-(--accent)/70 via-[#cb8b39]/50 to-(--accent)/70" />
      <Link
        href={`/clubs/${club.id}`}
        aria-label={`Open ${club.name}`}
        className="absolute inset-0 z-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-soft) focus-visible:ring-offset-2 focus-visible:ring-offset-(--surface-strong)"
      />

      <CardHeader className="relative z-10 space-y-3 pointer-events-none">
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
        <CardTitle className="text-2xl transition-transform duration-200 group-hover:translate-x-0.5 group-focus-within:translate-x-0.5">
          {club.name}
        </CardTitle>
      </CardHeader>

      <CardContent className="relative z-10 space-y-4 pointer-events-none">
        <p className="pointer-events-none text-sm leading-6 text-(--muted)">
          {club.description ?? "No club description yet."}
        </p>

        <div className="pointer-events-auto flex flex-wrap gap-2">
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

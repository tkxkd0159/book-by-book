import { forbidden, notFound } from "next/navigation";
import { cache } from "react";

import { getCurrentUser } from "@/lib/auth/server";
import { canViewClub } from "@/lib/clubs/permissions";
import { findClubDetail } from "@/lib/clubs/repository";

export function readMessage(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export const loadClubOverviewContext = cache(async (clubId: string) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return null;
  }

  const club = await findClubDetail(clubId, currentUser.id);

  if (!club) {
    notFound();
  }

  if (!canViewClub(club.visibility, club.currentUserRole)) {
    forbidden();
  }

  return {
    currentUser,
    club,
  };
});

export function ClubPageFeedback({
  message,
  error,
}: {
  message: string | null;
  error: string | null;
}) {
  return (
    <>
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
    </>
  );
}

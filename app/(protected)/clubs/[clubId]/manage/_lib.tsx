import { headers } from "next/headers";
import { forbidden, notFound } from "next/navigation";
import { cache } from "react";

import { getCurrentUser } from "@/lib/auth/server";
import { isClubAdmin } from "@/lib/clubs/permissions";
import { findClubDetail } from "@/lib/clubs/repository";

export function readMessage(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export const loadManageClubContext = cache(async (clubId: string) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return null;
  }

  const club = await findClubDetail(clubId, currentUser.id);

  if (!club) {
    notFound();
  }

  if (!isClubAdmin(club.currentUserRole)) {
    forbidden();
  }

  return {
    currentUser,
    club,
  };
});

export async function getInviteLink(token: string | null) {
  if (!token) {
    return null;
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  if (!host) {
    return `/clubs/invitations/${encodeURIComponent(token)}`;
  }

  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");

  return `${protocol}://${host}/clubs/invitations/${encodeURIComponent(token)}`;
}

export function ManagePageFeedback({
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

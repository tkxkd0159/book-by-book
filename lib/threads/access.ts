import { getCurrentUser } from "@/lib/auth/server";
import { isClubMember } from "@/lib/clubs/permissions";
import { findClubDetail, type ClubDetail } from "@/lib/clubs/repository";
import type { AuthUser, ClubMemberRole } from "@/types/db";

type ThreadMemberClub = ClubDetail & {
  currentUserRole: ClubMemberRole;
};

export type ThreadMemberRouteAccess =
  | { status: "unauthorized" }
  | { status: "not_found" }
  | { status: "forbidden"; club: ClubDetail }
  | {
      status: "ok";
      currentUser: AuthUser;
      club: ThreadMemberClub;
    };

export async function loadThreadMemberRouteAccess(
  clubId: string,
): Promise<ThreadMemberRouteAccess> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { status: "unauthorized" };
  }

  const club = await findClubDetail(clubId, currentUser.id);
  if (!club) {
    return { status: "not_found" };
  }

  if (!isClubMember(club.currentUserRole)) {
    return { status: "forbidden", club };
  }

  return {
    status: "ok",
    currentUser,
    club: {
      ...club,
      currentUserRole: club.currentUserRole,
    },
  };
}

import type { ClubMemberRole, ClubVisibility } from "@/types/db";

export function isClubOwner(role: ClubMemberRole | null | undefined) {
  return role === "OWNER";
}

export function isClubAdmin(role: ClubMemberRole | null | undefined) {
  return role === "OWNER" || role === "ADMIN";
}

export function isClubMember(role: ClubMemberRole | null | undefined) {
  return role === "OWNER" || role === "ADMIN" || role === "MEMBER";
}

export function canViewClub(
  visibility: ClubVisibility,
  role: ClubMemberRole | null | undefined,
) {
  return visibility === "PUBLIC" || isClubMember(role);
}

export function canJoinClub(
  visibility: ClubVisibility,
  role: ClubMemberRole | null | undefined,
) {
  return visibility === "PUBLIC" && !isClubMember(role);
}

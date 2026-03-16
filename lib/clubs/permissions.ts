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

export function canLeaveClub(role: ClubMemberRole | null | undefined) {
  return role === "ADMIN" || role === "MEMBER";
}

export function canDeleteClub(role: ClubMemberRole | null | undefined) {
  return isClubOwner(role);
}

export function canTransferClubOwnership(role: ClubMemberRole | null | undefined) {
  return isClubOwner(role);
}

export function canChangeClubMemberRole(
  actorRole: ClubMemberRole | null | undefined,
  targetRole: ClubMemberRole,
  nextRole: Extract<ClubMemberRole, "ADMIN" | "MEMBER">,
) {
  if (targetRole === "OWNER" || targetRole === nextRole) {
    return false;
  }

  if (isClubOwner(actorRole)) {
    return true;
  }

  return actorRole === "ADMIN" && targetRole === "MEMBER" && nextRole === "ADMIN";
}

export function canRemoveClubMember(
  actorRole: ClubMemberRole | null | undefined,
  targetRole: ClubMemberRole,
) {
  if (isClubOwner(actorRole)) {
    return targetRole !== "OWNER";
  }

  return actorRole === "ADMIN" && targetRole === "MEMBER";
}

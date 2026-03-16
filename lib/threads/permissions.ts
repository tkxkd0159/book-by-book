import type { ClubMemberRole } from "@/types/db";

import { isClubAdmin, isClubMember } from "@/lib/clubs/permissions";

export function canViewThreads(role: ClubMemberRole | null | undefined) {
  return isClubMember(role);
}

export function canCreateThreads(role: ClubMemberRole | null | undefined) {
  return isClubMember(role);
}

export function canCreateThreadPosts(role: ClubMemberRole | null | undefined) {
  return isClubMember(role);
}

export function canManageThreadPins(role: ClubMemberRole | null | undefined) {
  return isClubAdmin(role);
}

export function canDeleteThreads(role: ClubMemberRole | null | undefined) {
  return isClubAdmin(role);
}

export function isThreadPostAuthor(
  authorId: string | null | undefined,
  currentUserId: string | null | undefined,
) {
  return Boolean(authorId && currentUserId && authorId === currentUserId);
}

export function canManageThreadPost(input: {
  role: ClubMemberRole | null | undefined;
  authorId: string | null | undefined;
  currentUserId: string | null | undefined;
}) {
  return canCreateThreadPosts(input.role) &&
    isThreadPostAuthor(input.authorId, input.currentUserId);
}

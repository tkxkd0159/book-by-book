import type { ClubMemberRole } from "@/types/db";

export type ClubViewSection = "board" | "members";
export type ClubViewMemberRoleFilter = "ALL" | ClubMemberRole;

export function readClubMemberRoleFilter(
  value: string | string[] | undefined,
): ClubViewMemberRoleFilter {
  const selectedRole = Array.isArray(value) ? value[0] : value;

  if (
    selectedRole === "OWNER" ||
    selectedRole === "ADMIN" ||
    selectedRole === "MEMBER"
  ) {
    return selectedRole;
  }

  return "ALL";
}

export function createClubSectionHref(input: {
  clubId: string;
  section: ClubViewSection;
  role?: ClubViewMemberRoleFilter;
}) {
  const pathname = `/clubs/${input.clubId}/${input.section}`;

  if (input.section !== "members") {
    return pathname;
  }

  const params = new URLSearchParams();

  if (input.role && input.role !== "ALL") {
    params.set("role", input.role);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function createClubEntryHref(clubId: string) {
  return createClubSectionHref({
    clubId,
    section: "board",
  });
}

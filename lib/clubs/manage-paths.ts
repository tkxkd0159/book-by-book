import type { ClubMemberRole } from "@/types/db";

export type ManageSection = "members" | "board" | "invite";
export type ManageMemberRoleFilter = "ALL" | ClubMemberRole;

export function readManageMemberRoleFilter(
  value: string | string[] | undefined,
): ManageMemberRoleFilter {
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

export function createManageSectionHref(input: {
  clubId: string;
  section: ManageSection;
  role?: ManageMemberRoleFilter;
}) {
  const pathname = `/clubs/${input.clubId}/manage/${input.section}`;

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

export function createManageEntryHref(clubId: string) {
  return createManageSectionHref({
    clubId,
    section: "members",
  });
}

export const MANAGE_SECTION = {
  members: "members",
  board: "board",
  invite: "invite",
} as const;

export type ManageSection = (typeof MANAGE_SECTION)[keyof typeof MANAGE_SECTION];

export const MANAGE_MEMBER_ROLE_FILTER = {
  all: "ALL",
  owner: "OWNER",
  admin: "ADMIN",
  member: "MEMBER",
} as const;

export type ManageMemberRoleFilter =
  (typeof MANAGE_MEMBER_ROLE_FILTER)[keyof typeof MANAGE_MEMBER_ROLE_FILTER];

export function readManageMemberRoleFilter(
  value: string | string[] | undefined,
): ManageMemberRoleFilter {
  const selectedRole = Array.isArray(value) ? value[0] : value;

  if (
    selectedRole === MANAGE_MEMBER_ROLE_FILTER.owner ||
    selectedRole === MANAGE_MEMBER_ROLE_FILTER.admin ||
    selectedRole === MANAGE_MEMBER_ROLE_FILTER.member
  ) {
    return selectedRole;
  }

  return MANAGE_MEMBER_ROLE_FILTER.all;
}

export function createManageSectionHref(input: {
  clubId: string;
  section: ManageSection;
  role?: ManageMemberRoleFilter;
}) {
  const pathname = `/clubs/${input.clubId}/manage/${input.section}`;

  if (input.section !== MANAGE_SECTION.members) {
    return pathname;
  }

  const params = new URLSearchParams();

  if (input.role && input.role !== MANAGE_MEMBER_ROLE_FILTER.all) {
    params.set("role", input.role);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function createManageEntryHref(clubId: string) {
  return createManageSectionHref({
    clubId,
    section: MANAGE_SECTION.members,
  });
}

export const CLUB_VIEW_SECTION = {
  board: "board",
  members: "members",
} as const;

export type ClubViewSection =
  (typeof CLUB_VIEW_SECTION)[keyof typeof CLUB_VIEW_SECTION];

export const CLUB_VIEW_MEMBER_ROLE_FILTER = {
  all: "ALL",
  owner: "OWNER",
  admin: "ADMIN",
  member: "MEMBER",
} as const;

export type ClubViewMemberRoleFilter =
  (typeof CLUB_VIEW_MEMBER_ROLE_FILTER)[keyof typeof CLUB_VIEW_MEMBER_ROLE_FILTER];

export function readClubMemberRoleFilter(
  value: string | string[] | undefined,
): ClubViewMemberRoleFilter {
  const selectedRole = Array.isArray(value) ? value[0] : value;

  if (
    selectedRole === CLUB_VIEW_MEMBER_ROLE_FILTER.owner ||
    selectedRole === CLUB_VIEW_MEMBER_ROLE_FILTER.admin ||
    selectedRole === CLUB_VIEW_MEMBER_ROLE_FILTER.member
  ) {
    return selectedRole;
  }

  return CLUB_VIEW_MEMBER_ROLE_FILTER.all;
}

export function createClubSectionHref(input: {
  clubId: string;
  section: ClubViewSection;
  role?: ClubViewMemberRoleFilter;
}) {
  const pathname = `/clubs/${input.clubId}/${input.section}`;

  if (input.section !== CLUB_VIEW_SECTION.members) {
    return pathname;
  }

  const params = new URLSearchParams();

  if (input.role && input.role !== CLUB_VIEW_MEMBER_ROLE_FILTER.all) {
    params.set("role", input.role);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function createClubEntryHref(clubId: string) {
  return createClubSectionHref({
    clubId,
    section: CLUB_VIEW_SECTION.board,
  });
}

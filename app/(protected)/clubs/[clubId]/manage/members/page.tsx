import { ClubMembersSection } from "@/components/clubs/club-members-section";
import {
  createManageSectionHref,
  readManageMemberRoleFilter,
} from "@/lib/clubs/manage-paths";
import { listClubMembers } from "@/lib/clubs/repository";

import { ManagePageFeedback, loadManageClubContext, readMessage } from "../_lib";

type ClubManageMembersPageProps = {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClubManageMembersPage({
  params,
  searchParams,
}: ClubManageMembersPageProps) {
  const [{ clubId }, paramsData] = await Promise.all([params, searchParams]);
  const context = await loadManageClubContext(clubId);

  if (!context) {
    return null;
  }

  const { club, currentUser } = context;
  const members = await listClubMembers(clubId, currentUser.id);
  const activeRoleFilter = readManageMemberRoleFilter(paramsData.role);
  const filteredMembers =
    activeRoleFilter === "ALL"
      ? members
      : members.filter((member) => member.role === activeRoleFilter);
  const returnTo = createManageSectionHref({
    clubId,
    section: "members",
    role: activeRoleFilter,
  });

  return (
    <>
      <ManagePageFeedback
        message={readMessage(paramsData.message)}
        error={readMessage(paramsData.error)}
      />

      <ClubMembersSection
        club={club}
        currentUserId={currentUser.id}
        members={members}
        filteredMembers={filteredMembers}
        activeRoleFilter={activeRoleFilter}
        roleFilterHrefs={{
          ALL: createManageSectionHref({
            clubId,
            section: "members",
            role: "ALL",
          }),
          OWNER: createManageSectionHref({
            clubId,
            section: "members",
            role: "OWNER",
          }),
          ADMIN: createManageSectionHref({
            clubId,
            section: "members",
            role: "ADMIN",
          }),
          MEMBER: createManageSectionHref({
            clubId,
            section: "members",
            role: "MEMBER",
          }),
        }}
        mode="manage"
        returnTo={returnTo}
      />
    </>
  );
}

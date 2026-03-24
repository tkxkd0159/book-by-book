import { forbidden } from "next/navigation";

import { ClubMembersSection } from "@/components/clubs/club-members-section";
import {
  createClubSectionHref,
  readClubMemberRoleFilter,
} from "@/lib/clubs/view-paths";
import { isClubMember } from "@/lib/clubs/permissions";
import { listClubMembers } from "@/lib/clubs/repository";

import { ClubPageFeedback, loadClubOverviewContext, readMessage } from "../_lib";

type ClubMembersPageProps = {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClubMembersPage({
  params,
  searchParams,
}: ClubMembersPageProps) {
  const [{ clubId }, paramsData] = await Promise.all([params, searchParams]);
  const { club, currentUser } = await loadClubOverviewContext(clubId);

  if (!isClubMember(club.currentUserRole)) {
    forbidden();
  }

  const members = await listClubMembers(clubId, currentUser.id);
  const activeRoleFilter = readClubMemberRoleFilter(paramsData.role);
  const filteredMembers =
    activeRoleFilter === "ALL"
      ? members
      : members.filter((member) => member.role === activeRoleFilter);

  return (
    <>
      <ClubPageFeedback
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
          ALL: createClubSectionHref({
            clubId,
            section: "members",
            role: "ALL",
          }),
          OWNER: createClubSectionHref({
            clubId,
            section: "members",
            role: "OWNER",
          }),
          ADMIN: createClubSectionHref({
            clubId,
            section: "members",
            role: "ADMIN",
          }),
          MEMBER: createClubSectionHref({
            clubId,
            section: "members",
            role: "MEMBER",
          }),
        }}
      />
    </>
  );
}

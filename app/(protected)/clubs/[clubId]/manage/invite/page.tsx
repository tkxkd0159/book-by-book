import { redirect } from "next/navigation";

import { ClubInvitationsSection } from "@/components/clubs/club-invitations-section";
import {
  createManageEntryHref,
  createManageSectionHref,
} from "@/lib/clubs/manage-paths";
import { listClubInvitations } from "@/lib/clubs/repository";

import {
  ManagePageFeedback,
  getInviteLink,
  loadManageClubContext,
  readMessage,
} from "../_lib";

type ClubManageInvitePageProps = {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClubManageInvitePage({
  params,
  searchParams,
}: ClubManageInvitePageProps) {
  const [{ clubId }, paramsData] = await Promise.all([params, searchParams]);
  const { club, currentUser } = await loadManageClubContext(clubId);

  if (club.visibility !== "PRIVATE") {
    redirect(createManageEntryHref(clubId));
  }

  const invitations = await listClubInvitations(clubId, currentUser.id);
  const inviteLink = await getInviteLink(readMessage(paramsData.token));

  return (
    <>
      <ManagePageFeedback
        message={readMessage(paramsData.message)}
        error={readMessage(paramsData.error)}
      />

      <ClubInvitationsSection
        clubId={club.id}
        invitations={invitations}
        inviteLink={inviteLink}
        returnTo={createManageSectionHref({
          clubId,
          section: "invite",
        })}
      />
    </>
  );
}

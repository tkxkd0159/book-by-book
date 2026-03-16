import { redirect } from "next/navigation";

import { createClubEntryHref } from "@/lib/clubs/view-paths";

type ClubPageProps = {
  params: Promise<{ clubId: string }>;
};

export default async function ClubDetailEntryPage({ params }: ClubPageProps) {
  const { clubId } = await params;
  redirect(createClubEntryHref(clubId));
}

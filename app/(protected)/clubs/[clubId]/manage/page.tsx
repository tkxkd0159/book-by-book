import { redirect } from "next/navigation";

import { createManageEntryHref } from "@/lib/clubs/manage-paths";

type ClubManagePageProps = {
  params: Promise<{ clubId: string }>;
};

export default async function ClubManagePage({ params }: ClubManagePageProps) {
  const { clubId } = await params;
  redirect(createManageEntryHref(clubId));
}

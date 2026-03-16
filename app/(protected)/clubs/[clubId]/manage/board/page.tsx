import { ClubSectionBoard } from "@/components/clubs/club-section-board";
import { createManageSectionHref } from "@/lib/clubs/manage-paths";
import { listClubBooks } from "@/lib/clubs/repository";

import { ManagePageFeedback, loadManageClubContext, readMessage } from "../_lib";

type ClubManageBoardPageProps = {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClubManageBoardPage({
  params,
  searchParams,
}: ClubManageBoardPageProps) {
  const [{ clubId }, paramsData] = await Promise.all([params, searchParams]);
  const context = await loadManageClubContext(clubId);

  if (!context) {
    return null;
  }

  const { club } = context;
  const books = await listClubBooks(clubId);

  return (
    <>
      <ManagePageFeedback
        message={readMessage(paramsData.message)}
        error={readMessage(paramsData.error)}
      />

      <section className="space-y-4 rounded-2xl border border-(--border) bg-(--surface-strong) p-5 shadow-[0_12px_28px_rgba(42,32,18,0.05)] sm:p-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Reading board management</h2>
          <p className="max-w-2xl text-sm text-(--muted)">
            Reorder the club&apos;s reading flow here without cluttering the
            main reading board for everyone else.
          </p>
        </div>

        <ClubSectionBoard
          clubId={club.id}
          books={books}
          mode="manage"
          returnTo={createManageSectionHref({
            clubId,
            section: "board",
          })}
        />
      </section>
    </>
  );
}

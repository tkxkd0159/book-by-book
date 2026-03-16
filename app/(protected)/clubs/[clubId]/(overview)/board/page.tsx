import { ClubSectionBoard } from "@/components/clubs/club-section-board";
import { listClubBooks } from "@/lib/clubs/repository";

import { ClubPageFeedback, loadClubOverviewContext, readMessage } from "../_lib";

type ClubBoardPageProps = {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClubBoardPage({
  params,
  searchParams,
}: ClubBoardPageProps) {
  const [{ clubId }, paramsData] = await Promise.all([params, searchParams]);
  const context = await loadClubOverviewContext(clubId);

  if (!context) {
    return null;
  }

  const { club } = context;
  const books = await listClubBooks(clubId);

  return (
    <>
      <ClubPageFeedback
        message={readMessage(paramsData.message)}
        error={readMessage(paramsData.error)}
      />

      <section className="space-y-4 rounded-2xl border border-(--border) bg-(--surface-strong) p-5 shadow-[0_12px_28px_rgba(42,32,18,0.05)] sm:p-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Reading board</h2>
          <p className="text-sm text-(--muted)">
            Shared books move through the club&apos;s reading pipeline.
          </p>
        </div>

        <ClubSectionBoard clubId={club.id} books={books} />
      </section>
    </>
  );
}

import type { ManageableClubBookTarget } from "@/lib/clubs/repository";

type ClubBookTargetSummaryState =
  | "no-manageable-clubs"
  | "all-already-added"
  | "has-addable";

type ClubBookTargetSummary = {
  state: ClubBookTargetSummaryState;
  totalCount: number;
  addableCount: number;
  alreadyAddedCount: number;
};

export function summarizeManageableClubBookTargets(
  targets: ManageableClubBookTarget[],
): ClubBookTargetSummary {
  const totalCount = targets.length;
  const alreadyAddedCount = targets.filter((target) => target.alreadyAdded).length;
  const addableCount = totalCount - alreadyAddedCount;

  if (totalCount === 0) {
    return {
      state: "no-manageable-clubs",
      totalCount,
      addableCount,
      alreadyAddedCount,
    };
  }

  if (addableCount === 0) {
    return {
      state: "all-already-added",
      totalCount,
      addableCount,
      alreadyAddedCount,
    };
  }

  return {
    state: "has-addable",
    totalCount,
    addableCount,
    alreadyAddedCount,
  };
}

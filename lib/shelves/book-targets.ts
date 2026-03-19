import type { ManageableShelfBookTarget } from "@/lib/shelves/repository";

type ShelfBookTargetSummaryState =
  | "no-shelves"
  | "all-already-added"
  | "has-addable";

type ShelfBookTargetSummary = {
  state: ShelfBookTargetSummaryState;
  totalCount: number;
  addableCount: number;
  alreadyAddedCount: number;
};

export function summarizeManageableShelfBookTargets(
  targets: ManageableShelfBookTarget[],
): ShelfBookTargetSummary {
  const totalCount = targets.length;
  const alreadyAddedCount = targets.filter((target) => target.alreadyAdded).length;
  const addableCount = totalCount - alreadyAddedCount;

  if (totalCount === 0) {
    return {
      state: "no-shelves",
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

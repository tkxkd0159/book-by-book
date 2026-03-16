import { describe, expect, it } from "vitest";

import { summarizeManageableClubBookTargets } from "@/lib/clubs/book-targets";

describe("club book target summaries", () => {
  it("reports an empty-state summary when no manageable clubs exist", () => {
    expect(summarizeManageableClubBookTargets([])).toEqual({
      state: "no-manageable-clubs",
      totalCount: 0,
      addableCount: 0,
      alreadyAddedCount: 0,
    });
  });

  it("marks addable clubs separately from already-added clubs", () => {
    expect(
      summarizeManageableClubBookTargets([
        {
          clubId: "club-1",
          clubName: "Weekend Readers",
          currentUserRole: "OWNER",
          alreadyAdded: false,
          existingStatus: null,
        },
        {
          clubId: "club-2",
          clubName: "Night Readers",
          currentUserRole: "ADMIN",
          alreadyAdded: true,
          existingStatus: "READING",
        },
      ]),
    ).toEqual({
      state: "has-addable",
      totalCount: 2,
      addableCount: 1,
      alreadyAddedCount: 1,
    });
  });

  it("reports when every manageable club already has the book", () => {
    expect(
      summarizeManageableClubBookTargets([
        {
          clubId: "club-1",
          clubName: "Weekend Readers",
          currentUserRole: "OWNER",
          alreadyAdded: true,
          existingStatus: "WANT_TO_READ",
        },
      ]),
    ).toEqual({
      state: "all-already-added",
      totalCount: 1,
      addableCount: 0,
      alreadyAddedCount: 1,
    });
  });
});

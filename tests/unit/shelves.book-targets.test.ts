import { describe, expect, it } from "vitest";

import { summarizeManageableShelfBookTargets } from "@/lib/shelves/book-targets";

describe("summarizeManageableShelfBookTargets", () => {
  it("reports when the user has no shelves", () => {
    expect(summarizeManageableShelfBookTargets([])).toEqual({
      state: "no-shelves",
      totalCount: 0,
      addableCount: 0,
      alreadyAddedCount: 0,
    });
  });

  it("reports when every shelf already contains the book", () => {
    expect(
      summarizeManageableShelfBookTargets([
        {
          shelfId: "shelf-1",
          shelfName: "Weekend Reads",
          isPublic: false,
          alreadyAdded: true,
        },
        {
          shelfId: "shelf-2",
          shelfName: "Shared Picks",
          isPublic: true,
          alreadyAdded: true,
        },
      ]),
    ).toEqual({
      state: "all-already-added",
      totalCount: 2,
      addableCount: 0,
      alreadyAddedCount: 2,
    });
  });

  it("reports when at least one shelf can still take the book", () => {
    expect(
      summarizeManageableShelfBookTargets([
        {
          shelfId: "shelf-1",
          shelfName: "Weekend Reads",
          isPublic: false,
          alreadyAdded: true,
        },
        {
          shelfId: "shelf-2",
          shelfName: "Shared Picks",
          isPublic: true,
          alreadyAdded: false,
        },
      ]),
    ).toEqual({
      state: "has-addable",
      totalCount: 2,
      addableCount: 1,
      alreadyAddedCount: 1,
    });
  });
});

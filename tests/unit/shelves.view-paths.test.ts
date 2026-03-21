import { describe, expect, it } from "vitest";

import {
  createMyShelfHref,
  createMyShelvesHref,
  createNewShelfHref,
  createPublicShelfHref,
} from "@/lib/shelves/view-paths";

describe("shelf view paths", () => {
  it("builds owner shelf paths", () => {
    expect(createMyShelvesHref()).toBe("/me/shelves");
    expect(createNewShelfHref()).toBe("/me/shelves/new");
    expect(createMyShelfHref("shelf-123")).toBe("/me/shelves/shelf-123");
  });

  it("builds signed-in public shelf paths", () => {
    expect(
      createPublicShelfHref({
        nickname: "owner-reader",
        shelfId: "shelf-123",
      }),
    ).toBe("/users/owner-reader/shelves/shelf-123");
  });
});

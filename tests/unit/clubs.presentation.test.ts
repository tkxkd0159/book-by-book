import { describe, expect, it } from "vitest";

import {
  CLUB_BOOK_STATUS_BADGE_VARIANTS,
  CLUB_MEMBER_COUNT_BADGE_VARIANT,
  CLUB_ROLE_BADGE_VARIANTS,
  CLUB_VISIBILITY_BADGE_VARIANTS,
} from "@/lib/clubs/presentation";

describe("club presentation variants", () => {
  it("maps club banner badges to distinct semantic variants", () => {
    expect(CLUB_VISIBILITY_BADGE_VARIANTS.PUBLIC).toBe("neutral");
    expect(CLUB_VISIBILITY_BADGE_VARIANTS.PRIVATE).toBe("neutral");
    expect(CLUB_MEMBER_COUNT_BADGE_VARIANT).toBe("amber");
    expect(CLUB_ROLE_BADGE_VARIANTS.OWNER).toBe("accent");
    expect(CLUB_ROLE_BADGE_VARIANTS.ADMIN).toBe("success");
    expect(CLUB_ROLE_BADGE_VARIANTS.MEMBER).toBe("info");
  });

  it("maps club-book statuses to readable badge variants", () => {
    expect(CLUB_BOOK_STATUS_BADGE_VARIANTS.WANT_TO_READ).toBe("amber");
    expect(CLUB_BOOK_STATUS_BADGE_VARIANTS.READING).toBe("info");
    expect(CLUB_BOOK_STATUS_BADGE_VARIANTS.READ).toBe("success");
  });
});

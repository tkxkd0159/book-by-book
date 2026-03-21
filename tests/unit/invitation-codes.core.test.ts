import { describe, expect, it } from "vitest";

import {
  formatInvitationCodeForDisplay,
  generateInvitationCode,
  hashInvitationCode,
  normalizeInvitationCode,
  resolveInvitationCodeStatus,
} from "@/lib/invitation-codes/core";

describe("invitation code helpers", () => {
  it("normalizes and hashes codes consistently", () => {
    expect(normalizeInvitationCode(" abcd-1234 ")).toBe("ABCD1234");
    expect(hashInvitationCode("abcd-1234")).toBe(hashInvitationCode("ABCD1234"));
    expect(formatInvitationCodeForDisplay("abcde12345fghij67890")).toBe(
      "ABCDE-12345-FGHIJ-67890",
    );
  });

  it("generates uppercase Crockford-style codes with the default length", () => {
    const code = generateInvitationCode();
    expect(code).toHaveLength(20);
    expect(code).toMatch(/^[A-Z2-9]+$/);
    expect(formatInvitationCodeForDisplay(code)).toMatch(
      /^[A-Z2-9]{5}(?:-[A-Z2-9]{5}){3}$/,
    );
  });

  it("derives invitation-code lifecycle state from activation, expiry, and usage", () => {
    const now = new Date("2026-03-21T00:00:00.000Z");

    expect(
      resolveInvitationCodeStatus({
        isActive: true,
        expiresAt: null,
        maxUses: null,
        redemptionCount: 0,
        now,
      }),
    ).toBe("ACTIVE");
    expect(
      resolveInvitationCodeStatus({
        isActive: false,
        expiresAt: null,
        maxUses: null,
        redemptionCount: 0,
        now,
      }),
    ).toBe("INACTIVE");
    expect(
      resolveInvitationCodeStatus({
        isActive: true,
        expiresAt: new Date("2026-03-20T23:59:59.000Z"),
        maxUses: null,
        redemptionCount: 0,
        now,
      }),
    ).toBe("EXPIRED");
    expect(
      resolveInvitationCodeStatus({
        isActive: true,
        expiresAt: null,
        maxUses: 2,
        redemptionCount: 2,
        now,
      }),
    ).toBe("EXHAUSTED");
  });
});

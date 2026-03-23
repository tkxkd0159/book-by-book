import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthSessionMock = vi.fn();
const forbiddenMock = vi.fn(() => {
  throw new Error("NEXT_FORBIDDEN");
});
const redirectMock = vi.fn((location: string) => {
  throw new Error(`NEXT_REDIRECT:${location}`);
});

vi.mock("next/navigation", () => ({
  forbidden: forbiddenMock,
  redirect: redirectMock,
}));

vi.mock("@/lib/auth/server", () => ({
  getAuthSession: getAuthSessionMock,
}));

describe("public auth pages", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("redirects authenticated users from the landing page via session identity", async () => {
    getAuthSessionMock.mockResolvedValue({
      user: {
        id: "user-123",
        sessionIdentity: "PUBLIC",
      },
    });

    const Page = (await import("@/app/page")).default;

    await expect(Page()).rejects.toThrow("NEXT_REDIRECT:/books/search");
    expect(getAuthSessionMock).toHaveBeenCalled();
  });

  it("redirects incomplete users from the public sign-in page via session identity", async () => {
    getAuthSessionMock.mockResolvedValue({
      user: {
        id: "user-123",
        sessionIdentity: "PUBLIC_INCOMPLETE",
      },
    });

    const SignInPage = (await import("@/app/signin/page")).default;

    await expect(
      SignInPage({
        searchParams: Promise.resolve({
          callbackUrl: "/clubs",
        }),
      } as never),
    ).rejects.toThrow("NEXT_REDIRECT:/signup?callbackUrl=%2Fclubs");
    expect(getAuthSessionMock).toHaveBeenCalled();
  });

  it("forbids public users from the admin sign-in page via session identity", async () => {
    getAuthSessionMock.mockResolvedValue({
      user: {
        id: "user-123",
        sessionIdentity: "PUBLIC",
      },
    });

    const AdminSignInPage = (await import("@/app/admin/signin/page")).default;

    await expect(
      AdminSignInPage({
        searchParams: Promise.resolve({}),
      } as never),
    ).rejects.toThrow("NEXT_FORBIDDEN");
    expect(getAuthSessionMock).toHaveBeenCalled();
  });
});

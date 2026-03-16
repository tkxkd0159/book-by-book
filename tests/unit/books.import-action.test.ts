import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((location: string) => {
  throw new Error(`NEXT_REDIRECT:${location}`);
});
const requireCurrentUserMock = vi.fn();
const ensureBookInDatabaseMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/auth/server", () => ({
  requireCurrentUser: requireCurrentUserMock,
}));

vi.mock("@/lib/books/repository", () => ({
  ensureBookInDatabase: ensureBookInDatabaseMock,
}));

describe("importBookAction", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("fails before importing when the caller is not authenticated", async () => {
    requireCurrentUserMock.mockRejectedValue(new Error("NEXT_REDIRECT:/signin"));

    const { importBookAction } = await import(
      "@/app/(protected)/books/search/actions"
    );

    await expect(
      importBookAction(
        new FormData(),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/signin");
    expect(ensureBookInDatabaseMock).not.toHaveBeenCalled();
  });

  it("redirects to a validation error when no volume id is supplied", async () => {
    requireCurrentUserMock.mockResolvedValue({
      id: "user-123",
    });

    const { importBookAction } = await import(
      "@/app/(protected)/books/search/actions"
    );

    await expect(importBookAction(new FormData())).rejects.toThrow(
      "NEXT_REDIRECT:/books/search?error=missing-volume-id",
    );
    expect(ensureBookInDatabaseMock).not.toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledWith("/books/search?error=missing-volume-id");
  });

  it("imports the book and redirects to its detail page for authenticated callers", async () => {
    requireCurrentUserMock.mockResolvedValue({
      id: "user-123",
    });
    ensureBookInDatabaseMock.mockResolvedValue({
      googleVolumeId: "club-test-book",
    });

    const formData = new FormData();
    formData.set("googleVolumeId", "club-test-book");

    const { importBookAction } = await import(
      "@/app/(protected)/books/search/actions"
    );

    await expect(importBookAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/books/club-test-book",
    );
    expect(ensureBookInDatabaseMock).toHaveBeenCalledWith("club-test-book");
    expect(redirectMock).toHaveBeenCalledWith("/books/club-test-book");
  });
});

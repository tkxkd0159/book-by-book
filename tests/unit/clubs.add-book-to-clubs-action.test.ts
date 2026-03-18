import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSignedBookImportToken } from "@/lib/books/import-token";

const redirectMock = vi.fn((location: string) => {
  throw new Error(`NEXT_REDIRECT:${location}`);
});
const revalidatePathMock = vi.fn();
const requireCurrentUserMock = vi.fn();
const enforceMutationRateLimitMock = vi.fn();
const ensureBookInDatabaseMock = vi.fn();
const addBookToClubMock = vi.fn();
const listManageableClubBookTargetsForGoogleVolumeIdMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/dist/client/components/redirect-error", () => ({
  isRedirectError: (error: unknown) =>
    error instanceof Error && error.message.startsWith("NEXT_REDIRECT:"),
}));

vi.mock("@/lib/auth/server", () => ({
  requireCurrentUser: requireCurrentUserMock,
}));

vi.mock("@/lib/rate-limit/mutation", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/rate-limit/mutation")>(
      "@/lib/rate-limit/mutation",
    );

  return {
    ...actual,
    enforceMutationRateLimit: enforceMutationRateLimitMock,
  };
});

vi.mock("@/lib/books/repository", () => ({
  ensureBookInDatabase: ensureBookInDatabaseMock,
}));

vi.mock("@/lib/clubs/repository", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/clubs/repository")>(
      "@/lib/clubs/repository",
    );

  return {
    ...actual,
    addBookToClub: addBookToClubMock,
    listManageableClubBookTargetsForGoogleVolumeId:
      listManageableClubBookTargetsForGoogleVolumeIdMock,
  };
});

describe("addBookToClubsFromVolumeAction", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    enforceMutationRateLimitMock.mockResolvedValue({
      allowed: true,
    });
  });

  it("fails before importing when the caller is not authenticated", async () => {
    requireCurrentUserMock.mockRejectedValue(new Error("NEXT_REDIRECT:/signin"));

    const { addBookToClubsFromVolumeAction } = await import(
      "@/app/(protected)/clubs/actions"
    );

    const formData = new FormData();
    formData.set("googleVolumeId", "club-test-book");
    formData.set("returnTo", "/books/club-test-book");
    formData.append("clubId", "club-1");

    await expect(addBookToClubsFromVolumeAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/signin",
    );
    expect(ensureBookInDatabaseMock).not.toHaveBeenCalled();
    expect(addBookToClubMock).not.toHaveBeenCalled();
  });

  it("adds the book to each eligible club with WANT_TO_READ", async () => {
    requireCurrentUserMock.mockResolvedValue({
      id: "user-123",
    });
    ensureBookInDatabaseMock.mockResolvedValue({
      id: "book-123",
      googleVolumeId: "club-test-book",
    });
    listManageableClubBookTargetsForGoogleVolumeIdMock.mockResolvedValue([
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
        alreadyAdded: false,
        existingStatus: null,
      },
    ]);

    const { addBookToClubsFromVolumeAction } = await import(
      "@/app/(protected)/clubs/actions"
    );

    const formData = new FormData();
    formData.set("googleVolumeId", "club-test-book");
    formData.set("returnTo", "/books/club-test-book");
    formData.append("clubId", "club-1");
    formData.append("clubId", "club-2");

    await expect(addBookToClubsFromVolumeAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/books/club-test-book?message=Book+added+to+2+clubs.",
    );

    expect(addBookToClubMock).toHaveBeenCalledTimes(2);
    expect(addBookToClubMock).toHaveBeenNthCalledWith(1, {
      clubId: "club-1",
      bookId: "book-123",
      addedById: "user-123",
      status: "WANT_TO_READ",
    });
    expect(addBookToClubMock).toHaveBeenNthCalledWith(2, {
      clubId: "club-2",
      bookId: "book-123",
      addedById: "user-123",
      status: "WANT_TO_READ",
    });
  });

  it("requires at least one selected club", async () => {
    requireCurrentUserMock.mockResolvedValue({
      id: "user-123",
    });

    const { addBookToClubsFromVolumeAction } = await import(
      "@/app/(protected)/clubs/actions"
    );

    const formData = new FormData();
    formData.set("googleVolumeId", "club-test-book");
    formData.set("returnTo", "/books/club-test-book");

    await expect(addBookToClubsFromVolumeAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/books/club-test-book?error=Select+at+least+one+club+to+add+this+book.",
    );

    expect(ensureBookInDatabaseMock).not.toHaveBeenCalled();
    expect(addBookToClubMock).not.toHaveBeenCalled();
  });

  it("skips already-added clubs and returns a partial-success message", async () => {
    requireCurrentUserMock.mockResolvedValue({
      id: "user-123",
    });
    ensureBookInDatabaseMock.mockResolvedValue({
      id: "book-123",
      googleVolumeId: "club-test-book",
    });
    listManageableClubBookTargetsForGoogleVolumeIdMock.mockResolvedValue([
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
    ]);

    const { addBookToClubsFromVolumeAction } = await import(
      "@/app/(protected)/clubs/actions"
    );

    const formData = new FormData();
    formData.set("googleVolumeId", "club-test-book");
    formData.set("returnTo", "/books/club-test-book");
    formData.append("clubId", "club-1");
    formData.append("clubId", "club-2");

    await expect(addBookToClubsFromVolumeAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/books/club-test-book?message=Book+added+to+1+club.+1+selection+already+had+this+book.",
    );

    expect(addBookToClubMock).toHaveBeenCalledTimes(1);
    expect(addBookToClubMock).toHaveBeenCalledWith({
      clubId: "club-1",
      bookId: "book-123",
      addedById: "user-123",
      status: "WANT_TO_READ",
    });
  });

  it("uses a signed detail snapshot to avoid a second Google fetch when available", async () => {
    requireCurrentUserMock.mockResolvedValue({
      id: "user-123",
    });
    ensureBookInDatabaseMock.mockResolvedValue({
      id: "book-123",
      googleVolumeId: "club-test-book",
    });
    listManageableClubBookTargetsForGoogleVolumeIdMock.mockResolvedValue([
      {
        clubId: "club-1",
        clubName: "Weekend Readers",
        currentUserRole: "OWNER",
        alreadyAdded: false,
        existingStatus: null,
      },
    ]);

    const { addBookToClubsFromVolumeAction } = await import(
      "@/app/(protected)/clubs/actions"
    );

    const formData = new FormData();
    formData.set("googleVolumeId", "club-test-book");
    formData.set("returnTo", "/books/club-test-book");
    formData.set(
      "bookImportToken",
      createSignedBookImportToken({
        googleVolumeId: "club-test-book",
        title: "Snapshot Book",
        subtitle: null,
        authors: ["Example Author"],
        publisher: "Example Publisher",
        publishedDate: "2025",
        description: "<p>Snapshot</p>",
        isbn10: null,
        isbn13: "9780000000000",
        pageCount: 320,
        categories: ["Fiction"],
        language: "en",
        thumbnailUrl: "https://books.google.com/thumbnail",
        previewLink: "https://books.google.com/preview",
        infoLink: "https://books.google.com/info",
        canonicalLink: "https://books.google.com/canonical",
        persisted: false,
      }),
    );
    formData.append("clubId", "club-1");

    await expect(addBookToClubsFromVolumeAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/books/club-test-book?message=Book+added+to+1+club.",
    );

    expect(ensureBookInDatabaseMock).toHaveBeenCalledWith("club-test-book", {
      prefetchedBook: expect.objectContaining({
        googleVolumeId: "club-test-book",
        title: "Snapshot Book",
      }),
    });
  });

  it("rejects when no selected clubs are still eligible", async () => {
    requireCurrentUserMock.mockResolvedValue({
      id: "user-123",
    });
    ensureBookInDatabaseMock.mockResolvedValue({
      id: "book-123",
      googleVolumeId: "club-test-book",
    });
    listManageableClubBookTargetsForGoogleVolumeIdMock.mockResolvedValue([
      {
        clubId: "club-1",
        clubName: "Weekend Readers",
        currentUserRole: "OWNER",
        alreadyAdded: true,
        existingStatus: "WANT_TO_READ",
      },
    ]);

    const { addBookToClubsFromVolumeAction } = await import(
      "@/app/(protected)/clubs/actions"
    );

    const formData = new FormData();
    formData.set("googleVolumeId", "club-test-book");
    formData.set("returnTo", "/books/club-test-book");
    formData.append("clubId", "club-1");

    await expect(addBookToClubsFromVolumeAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/books/club-test-book?error=This+book+can+no+longer+be+added+to+the+selected+clubs.",
    );

    expect(addBookToClubMock).not.toHaveBeenCalled();
  });
});

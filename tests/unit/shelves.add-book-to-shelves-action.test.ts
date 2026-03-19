import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSignedBookImportToken } from "@/lib/books/import-token";

const redirectMock = vi.fn((location: string) => {
  throw new Error(`NEXT_REDIRECT:${location}`);
});
const revalidatePathMock = vi.fn();
const requireCurrentUserMock = vi.fn();
const enforceMutationRateLimitMock = vi.fn();
const ensureBookInDatabaseMock = vi.fn();
const addBookToShelfMock = vi.fn();
const listManageableShelfBookTargetsForGoogleVolumeIdMock = vi.fn();

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

vi.mock("@/lib/shelves/repository", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/shelves/repository")>(
      "@/lib/shelves/repository",
    );

  return {
    ...actual,
    addBookToShelf: addBookToShelfMock,
    listManageableShelfBookTargetsForGoogleVolumeId:
      listManageableShelfBookTargetsForGoogleVolumeIdMock,
  };
});

describe("addBookToShelvesFromVolumeAction", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    enforceMutationRateLimitMock.mockResolvedValue({ allowed: true });
  });

  it("requires at least one selected shelf", async () => {
    requireCurrentUserMock.mockResolvedValue({
      id: "user-123",
    });

    const { addBookToShelvesFromVolumeAction } = await import(
      "@/app/(protected)/me/shelves/actions"
    );

    const formData = new FormData();
    formData.set("googleVolumeId", "shelf-test-book");
    formData.set("returnTo", "/books/shelf-test-book");

    await expect(addBookToShelvesFromVolumeAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/books/shelf-test-book?error=Select+at+least+one+shelf+to+add+this+book.",
    );

    expect(ensureBookInDatabaseMock).not.toHaveBeenCalled();
    expect(addBookToShelfMock).not.toHaveBeenCalled();
  });

  it("adds the book to each eligible shelf", async () => {
    requireCurrentUserMock.mockResolvedValue({
      id: "user-123",
    });
    ensureBookInDatabaseMock.mockResolvedValue({
      id: "book-123",
      googleVolumeId: "shelf-test-book",
    });
    listManageableShelfBookTargetsForGoogleVolumeIdMock.mockResolvedValue([
      {
        shelfId: "shelf-1",
        shelfName: "Weekend Reads",
        isPublic: false,
        alreadyAdded: false,
      },
      {
        shelfId: "shelf-2",
        shelfName: "Shared Picks",
        isPublic: true,
        alreadyAdded: false,
      },
    ]);

    const { addBookToShelvesFromVolumeAction } = await import(
      "@/app/(protected)/me/shelves/actions"
    );

    const formData = new FormData();
    formData.set("googleVolumeId", "shelf-test-book");
    formData.set("returnTo", "/books/shelf-test-book");
    formData.append("shelfId", "shelf-1");
    formData.append("shelfId", "shelf-2");

    await expect(addBookToShelvesFromVolumeAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/books/shelf-test-book?message=Book+added+to+2+shelves.",
    );

    expect(addBookToShelfMock).toHaveBeenCalledTimes(2);
    expect(addBookToShelfMock).toHaveBeenNthCalledWith(1, {
      shelfId: "shelf-1",
      bookId: "book-123",
      addedById: "user-123",
    });
    expect(addBookToShelfMock).toHaveBeenNthCalledWith(2, {
      shelfId: "shelf-2",
      bookId: "book-123",
      addedById: "user-123",
    });
  });

  it("skips already-added shelves and uses a signed detail snapshot when present", async () => {
    requireCurrentUserMock.mockResolvedValue({
      id: "user-123",
    });
    ensureBookInDatabaseMock.mockResolvedValue({
      id: "book-123",
      googleVolumeId: "shelf-test-book",
    });
    listManageableShelfBookTargetsForGoogleVolumeIdMock.mockResolvedValue([
      {
        shelfId: "shelf-1",
        shelfName: "Weekend Reads",
        isPublic: false,
        alreadyAdded: false,
      },
      {
        shelfId: "shelf-2",
        shelfName: "Shared Picks",
        isPublic: true,
        alreadyAdded: true,
      },
    ]);

    const { addBookToShelvesFromVolumeAction } = await import(
      "@/app/(protected)/me/shelves/actions"
    );

    const formData = new FormData();
    formData.set("googleVolumeId", "shelf-test-book");
    formData.set("returnTo", "/books/shelf-test-book");
    formData.set(
      "bookImportToken",
      createSignedBookImportToken({
        googleVolumeId: "shelf-test-book",
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
    formData.append("shelfId", "shelf-1");
    formData.append("shelfId", "shelf-2");

    await expect(addBookToShelvesFromVolumeAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/books/shelf-test-book?message=Book+added+to+1+shelf.+1+selection+already+had+this+book.",
    );

    expect(ensureBookInDatabaseMock).toHaveBeenCalledWith("shelf-test-book", {
      prefetchedBook: expect.objectContaining({
        googleVolumeId: "shelf-test-book",
        title: "Snapshot Book",
      }),
    });
    expect(addBookToShelfMock).toHaveBeenCalledTimes(1);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSignedBookImportToken } from "@/lib/books/import-token";

const redirectMock = vi.fn((location: string) => {
  throw new Error(`NEXT_REDIRECT:${location}`);
});
const revalidatePathMock = vi.fn();
const requireCurrentUserMock = vi.fn();
const ensureBookInDatabaseMock = vi.fn();
const findBookByGoogleVolumeIdMock = vi.fn();
const upsertReviewMock = vi.fn();
const deleteReviewMock = vi.fn();

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

vi.mock("@/lib/books/repository", () => ({
  ensureBookInDatabase: ensureBookInDatabaseMock,
  findBookByGoogleVolumeId: findBookByGoogleVolumeIdMock,
}));

vi.mock("@/lib/reviews/repository", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/reviews/repository")>(
      "@/lib/reviews/repository",
    );

  return {
    ...actual,
    upsertReview: upsertReviewMock,
    deleteReview: deleteReviewMock,
  };
});

describe("review actions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireCurrentUserMock.mockResolvedValue({ id: "user-123" });
  });

  it("upserts a review and reuses a signed detail snapshot when available", async () => {
    ensureBookInDatabaseMock.mockResolvedValue({
      id: "book-123",
      googleVolumeId: "club-test-book",
    });

    const { upsertReviewAction } = await import(
      "@/app/(protected)/me/reviews/actions"
    );

    const formData = new FormData();
    formData.set("googleVolumeId", "club-test-book");
    formData.set("returnTo", "/books/club-test-book#review-editor");
    formData.set("rating", "5");
    formData.set("body", "  Loved the ending.  ");
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

    await expect(upsertReviewAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/books/club-test-book?message=Review+saved.#review-editor",
    );

    expect(ensureBookInDatabaseMock).toHaveBeenCalledWith("club-test-book", {
      prefetchedBook: expect.objectContaining({
        googleVolumeId: "club-test-book",
        title: "Snapshot Book",
      }),
    });
    expect(upsertReviewMock).toHaveBeenCalledWith({
      userId: "user-123",
      bookId: "book-123",
      rating: 5,
      body: "Loved the ending.",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/me");
    expect(revalidatePathMock).toHaveBeenCalledWith("/me/reviewed");
    expect(revalidatePathMock).toHaveBeenCalledWith("/books/club-test-book");
  });

  it("redirects with a validation error when no rating is selected", async () => {
    const { upsertReviewAction } = await import(
      "@/app/(protected)/me/reviews/actions"
    );

    const formData = new FormData();
    formData.set("googleVolumeId", "club-test-book");
    formData.set("returnTo", "/books/club-test-book#review-editor");
    formData.set("body", "No rating yet.");

    await expect(upsertReviewAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/books/club-test-book?error=Choose+a+rating+from+1+to+5.#review-editor",
    );

    expect(ensureBookInDatabaseMock).not.toHaveBeenCalled();
    expect(upsertReviewMock).not.toHaveBeenCalled();
  });

  it("deletes a review and redirects back to the review page", async () => {
    findBookByGoogleVolumeIdMock.mockResolvedValue({
      id: "book-123",
      googleVolumeId: "club-test-book",
    });

    const { deleteReviewAction } = await import(
      "@/app/(protected)/me/reviews/actions"
    );

    const formData = new FormData();
    formData.set("googleVolumeId", "club-test-book");
    formData.set("returnTo", "/books/club-test-book#review-editor");

    await expect(deleteReviewAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/books/club-test-book?message=Review+deleted.#review-editor",
    );

    expect(deleteReviewMock).toHaveBeenCalledWith({
      userId: "user-123",
      bookId: "book-123",
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((location: string) => {
  throw new Error(`NEXT_REDIRECT:${location}`);
});
const requireCurrentUserMock = vi.fn();
const enforceMutationRateLimitMock = vi.fn();
const addBookToClubMock = vi.fn();
const listShelfImportSourcesForClubMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
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

vi.mock("@/lib/clubs/repository", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/clubs/repository")>(
      "@/lib/clubs/repository",
    );

  return {
    ...actual,
    addBookToClub: addBookToClubMock,
    listShelfImportSourcesForClub: listShelfImportSourcesForClubMock,
  };
});

describe("addBooksFromShelfToClubAction", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    enforceMutationRateLimitMock.mockResolvedValue({ allowed: true });
  });

  it("requires at least one selected shelf book", async () => {
    requireCurrentUserMock.mockResolvedValue({
      id: "user-123",
    });

    const { addBooksFromShelfToClubAction } = await import(
      "@/app/(protected)/clubs/actions"
    );

    const formData = new FormData();
    formData.set("clubId", "club-1");
    formData.set("shelfId", "shelf-1");
    formData.set("returnTo", "/clubs/club-1/manage/board");

    await expect(addBooksFromShelfToClubAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/clubs/club-1/manage/board?error=Select+at+least+one+shelf+book+to+add+to+the+club.",
    );
  });

  it("adds eligible shelf books to WANT_TO_READ", async () => {
    requireCurrentUserMock.mockResolvedValue({
      id: "user-123",
    });
    listShelfImportSourcesForClubMock.mockResolvedValue([
      {
        shelfId: "shelf-1",
        shelfName: "Weekend Reads",
        isPublic: false,
        books: [
          {
            bookId: "book-1",
            googleVolumeId: "vol-1",
            title: "Book One",
            authors: ["Author One"],
            thumbnailUrl: null,
            note: null,
          },
          {
            bookId: "book-2",
            googleVolumeId: "vol-2",
            title: "Book Two",
            authors: ["Author Two"],
            thumbnailUrl: null,
            note: "Shelf note",
          },
        ],
      },
    ]);

    const { addBooksFromShelfToClubAction } = await import(
      "@/app/(protected)/clubs/actions"
    );

    const formData = new FormData();
    formData.set("clubId", "club-1");
    formData.set("shelfId", "shelf-1");
    formData.set("returnTo", "/clubs/club-1/manage/board");
    formData.append("bookId", "book-1");
    formData.append("bookId", "book-2");

    await expect(addBooksFromShelfToClubAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/clubs/club-1/manage/board?message=2+books+added+to+the+club.",
    );

    expect(addBookToClubMock).toHaveBeenCalledTimes(2);
    expect(addBookToClubMock).toHaveBeenNthCalledWith(1, {
      clubId: "club-1",
      bookId: "book-1",
      addedById: "user-123",
      status: "WANT_TO_READ",
    });
    expect(addBookToClubMock).toHaveBeenNthCalledWith(2, {
      clubId: "club-1",
      bookId: "book-2",
      addedById: "user-123",
      status: "WANT_TO_READ",
    });
  });

  it("skips stale selections that are no longer importable", async () => {
    requireCurrentUserMock.mockResolvedValue({
      id: "user-123",
    });
    listShelfImportSourcesForClubMock.mockResolvedValue([
      {
        shelfId: "shelf-1",
        shelfName: "Weekend Reads",
        isPublic: false,
        books: [
          {
            bookId: "book-1",
            googleVolumeId: "vol-1",
            title: "Book One",
            authors: ["Author One"],
            thumbnailUrl: null,
            note: null,
          },
        ],
      },
    ]);

    const { addBooksFromShelfToClubAction } = await import(
      "@/app/(protected)/clubs/actions"
    );

    const formData = new FormData();
    formData.set("clubId", "club-1");
    formData.set("shelfId", "shelf-1");
    formData.set("returnTo", "/clubs/club-1/manage/board");
    formData.append("bookId", "book-1");
    formData.append("bookId", "book-2");

    await expect(addBooksFromShelfToClubAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/clubs/club-1/manage/board?message=1+book+added+to+the+club.+1+selection+already+had+this+book.",
    );

    expect(addBookToClubMock).toHaveBeenCalledTimes(1);
    expect(addBookToClubMock).toHaveBeenCalledWith({
      clubId: "club-1",
      bookId: "book-1",
      addedById: "user-123",
      status: "WANT_TO_READ",
    });
  });
});

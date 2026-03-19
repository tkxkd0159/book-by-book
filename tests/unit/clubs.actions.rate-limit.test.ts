import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((location: string) => {
  throw new Error(`NEXT_REDIRECT:${location}`);
});
const revalidatePathMock = vi.fn();
const requireCurrentUserMock = vi.fn();
const enforceMutationRateLimitMock = vi.fn();
const createClubMock = vi.fn();
const addBookToClubMock = vi.fn();
const addBooksToClubMock = vi.fn();
const ensureBookInDatabaseMock = vi.fn();
const listManageableClubBookTargetsForGoogleVolumeIdMock = vi.fn();
const listShelfImportSourcesForClubMock = vi.fn();
const createThreadMock = vi.fn();

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
    createClub: createClubMock,
    addBookToClub: addBookToClubMock,
    addBooksToClub: addBooksToClubMock,
    listShelfImportSourcesForClub: listShelfImportSourcesForClubMock,
    listManageableClubBookTargetsForGoogleVolumeId:
      listManageableClubBookTargetsForGoogleVolumeIdMock,
  };
});

async function captureRedirectLocation(action: Promise<unknown>) {
  try {
    await action;
  } catch (error) {
    expect(error).toBeInstanceOf(Error);

    if (error instanceof Error) {
      const prefix = "NEXT_REDIRECT:";

      expect(error.message.startsWith(prefix)).toBe(true);
      return error.message.slice(prefix.length);
    }
  }

  throw new Error("Expected action to redirect.");
}

vi.mock("@/lib/threads/repository", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/threads/repository")>(
      "@/lib/threads/repository",
    );

  return {
    ...actual,
    createThread: createThreadMock,
  };
});

describe("server action mutation rate limits", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireCurrentUserMock.mockResolvedValue({ id: "user-123" });
  });

  it("blocks createClubAction before creating a club", async () => {
    const { MutationRateLimitError } = await import("@/lib/rate-limit/mutation");
    enforceMutationRateLimitMock.mockRejectedValue(
      new MutationRateLimitError("create-club", {
        action: "create-club",
        allowed: false,
        limit: 3,
        remaining: 0,
        retryAfterSeconds: 600,
        resetAt: "2026-03-17T00:10:00.000Z",
      }),
    );

    const { createClubAction } = await import("@/app/(protected)/clubs/actions");

    const formData = new FormData();
    formData.set("name", "Rate Limited Club");
    formData.set("description", "blocked");
    formData.set("visibility", "PUBLIC");

    const location = await captureRedirectLocation(createClubAction(formData));
    const url = new URL(location, "http://localhost");

    expect(url.pathname).toBe("/clubs/new");
    expect(url.searchParams.get("error")).toBe(
      "You're creating clubs too quickly. Please wait about 10 minutes and try again.",
    );
    expect(createClubMock).not.toHaveBeenCalled();
  });

  it("blocks addBookToClubAction before mutating club books", async () => {
    const { MutationRateLimitError } = await import("@/lib/rate-limit/mutation");
    enforceMutationRateLimitMock.mockRejectedValue(
      new MutationRateLimitError("add-book", {
        action: "add-book",
        allowed: false,
        limit: 20,
        remaining: 0,
        retryAfterSeconds: 60,
        resetAt: "2026-03-17T00:01:00.000Z",
      }),
    );

    const { addBookToClubAction } = await import("@/app/(protected)/clubs/actions");

    const formData = new FormData();
    formData.set("clubId", "club-123");
    formData.set("bookId", "book-123");
    formData.set("status", "WANT_TO_READ");
    formData.set("returnTo", "/clubs/club-123");

    const location = await captureRedirectLocation(addBookToClubAction(formData));
    const url = new URL(location, "http://localhost");

    expect(url.pathname).toBe("/clubs/club-123");
    expect(url.searchParams.get("error")).toBe(
      "You're adding books too quickly. Please wait about 1 minute and try again.",
    );
    expect(addBookToClubMock).not.toHaveBeenCalled();
  });

  it("blocks addBookToClubsFromVolumeAction before importing and adding the book", async () => {
    const { MutationRateLimitError } = await import("@/lib/rate-limit/mutation");
    enforceMutationRateLimitMock.mockRejectedValue(
      new MutationRateLimitError("add-book", {
        action: "add-book",
        allowed: false,
        limit: 20,
        remaining: 0,
        retryAfterSeconds: 60,
        resetAt: "2026-03-17T00:01:00.000Z",
      }),
    );

    const { addBookToClubsFromVolumeAction } = await import(
      "@/app/(protected)/clubs/actions"
    );

    const formData = new FormData();
    formData.set("googleVolumeId", "club-test-book");
    formData.set("returnTo", "/books/club-test-book");
    formData.append("clubId", "club-1");

    const location = await captureRedirectLocation(
      addBookToClubsFromVolumeAction(formData),
    );
    const url = new URL(location, "http://localhost");

    expect(url.pathname).toBe("/books/club-test-book");
    expect(url.searchParams.get("error")).toBe(
      "You're adding books too quickly. Please wait about 1 minute and try again.",
    );
    expect(ensureBookInDatabaseMock).not.toHaveBeenCalled();
    expect(addBookToClubMock).not.toHaveBeenCalled();
    expect(listManageableClubBookTargetsForGoogleVolumeIdMock).not.toHaveBeenCalled();
  });

  it("blocks createThreadAction before creating a thread", async () => {
    const { MutationRateLimitError } = await import("@/lib/rate-limit/mutation");
    enforceMutationRateLimitMock.mockRejectedValue(
      new MutationRateLimitError("start-thread", {
        action: "start-thread",
        allowed: false,
        limit: 10,
        remaining: 0,
        retryAfterSeconds: 600,
        resetAt: "2026-03-17T00:10:00.000Z",
      }),
    );

    const { createThreadAction } = await import("@/app/(protected)/clubs/actions");

    const formData = new FormData();
    formData.set("clubId", "club-123");
    formData.set("clubBookId", "club-book-123");
    formData.set("title", "Thread title");
    formData.set("body", "Thread body");
    formData.set("returnTo", "/clubs/club-123/books/club-book-123");

    const location = await captureRedirectLocation(createThreadAction(formData));
    const url = new URL(location, "http://localhost");

    expect(url.pathname).toBe("/clubs/club-123/books/club-book-123");
    expect(url.searchParams.get("error")).toBe(
      "You're starting threads too quickly. Please wait about 10 minutes and try again.",
    );
    expect(createThreadMock).not.toHaveBeenCalled();
  });

  it("blocks addBooksFromShelfToClubAction before importing shelf books", async () => {
    const { MutationRateLimitError } = await import("@/lib/rate-limit/mutation");
    enforceMutationRateLimitMock.mockRejectedValue(
      new MutationRateLimitError("add-book", {
        action: "add-book",
        allowed: false,
        limit: 20,
        remaining: 0,
        retryAfterSeconds: 60,
        resetAt: "2026-03-17T00:01:00.000Z",
      }),
    );

    const { addBooksFromShelfToClubAction } = await import(
      "@/app/(protected)/clubs/actions"
    );

    const formData = new FormData();
    formData.set("clubId", "club-123");
    formData.set("shelfId", "shelf-123");
    formData.set("returnTo", "/clubs/club-123/manage/board");
    formData.append("bookId", "book-123");

    const location = await captureRedirectLocation(
      addBooksFromShelfToClubAction(formData),
    );
    const url = new URL(location, "http://localhost");

    expect(url.pathname).toBe("/clubs/club-123/manage/board");
    expect(url.searchParams.get("error")).toBe(
      "You're adding books too quickly. Please wait about 1 minute and try again.",
    );
    expect(listShelfImportSourcesForClubMock).not.toHaveBeenCalled();
    expect(addBooksToClubMock).not.toHaveBeenCalled();
    expect(addBookToClubMock).not.toHaveBeenCalled();
  });
});

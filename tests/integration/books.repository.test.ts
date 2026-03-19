import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetTestDatabase } from "@/lib/test/fixtures";
import { E2E_SEARCH_RESULT_FIXTURE } from "@/lib/test/constants";

describe("books repository integration", () => {
  const originalBooksProvider = process.env.BOOKS_PROVIDER;

  beforeEach(async () => {
    vi.resetModules();
    await resetTestDatabase();
    process.env.BOOKS_PROVIDER = "fixture";
  });

  afterEach(() => {
    if (originalBooksProvider) {
      process.env.BOOKS_PROVIDER = originalBooksProvider;
      return;
    }

    delete process.env.BOOKS_PROVIDER;
  });

  it("persists a non-seeded fixture-provider book on demand", async () => {
    const { ensureBookInDatabase, findBookByGoogleVolumeId } = await import(
      "@/lib/books/repository"
    );

    expect(
      await findBookByGoogleVolumeId(E2E_SEARCH_RESULT_FIXTURE.googleVolumeId),
    ).toBeNull();

    const persistedBook = await ensureBookInDatabase(
      E2E_SEARCH_RESULT_FIXTURE.googleVolumeId,
    );

    expect(persistedBook?.googleVolumeId).toBe(
      E2E_SEARCH_RESULT_FIXTURE.googleVolumeId,
    );
    expect(persistedBook?.title).toBe(E2E_SEARCH_RESULT_FIXTURE.title);
    expect(
      await findBookByGoogleVolumeId(E2E_SEARCH_RESULT_FIXTURE.googleVolumeId),
    ).toMatchObject({
      googleVolumeId: E2E_SEARCH_RESULT_FIXTURE.googleVolumeId,
      title: E2E_SEARCH_RESULT_FIXTURE.title,
    });
  });
});

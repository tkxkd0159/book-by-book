import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { E2E_SEARCH_RESULT_FIXTURE } from "@/tests/support/books/google-books-fixtures";
import { googleBooksMockServer } from "@/tests/support/msw/server";
import { resetTestDatabase } from "@/tests/support/fixtures";

const originalMockGoogleBooks = process.env.MOCK_GOOGLE_BOOKS;

describe("books repository integration", () => {
  beforeAll(() => {
    googleBooksMockServer.listen({ onUnhandledRequest: "error" });
  });

  beforeEach(async () => {
    vi.resetModules();
    process.env.MOCK_GOOGLE_BOOKS = "1";
    await resetTestDatabase();
  });

  afterEach(() => {
    googleBooksMockServer.resetHandlers();

    if (originalMockGoogleBooks) {
      process.env.MOCK_GOOGLE_BOOKS = originalMockGoogleBooks;
      return;
    }

    delete process.env.MOCK_GOOGLE_BOOKS;
  });

  afterAll(() => {
    googleBooksMockServer.close();
  });

  it("persists a non-seeded MSW-backed book on demand", async () => {
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

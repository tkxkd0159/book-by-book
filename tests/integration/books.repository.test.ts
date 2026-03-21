import {
  afterEach,
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { resetTestDatabase } from "@/lib/test-harness/fixtures";
import { E2E_SEARCH_RESULT_FIXTURE } from "@/lib/test-harness/google-books-fixtures";
import { googleBooksMockServer } from "@/tests/support/msw/server";

describe("books repository integration", () => {
  beforeAll(() => {
    googleBooksMockServer.listen({ onUnhandledRequest: "error" });
  });

  beforeEach(async () => {
    vi.resetModules();
    await resetTestDatabase();
  });

  afterEach(() => {
    googleBooksMockServer.resetHandlers();
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

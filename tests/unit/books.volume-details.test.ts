import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NormalizedBook } from "@/lib/books/types";
import type { BookRecord } from "@/types/db";

const { findBookByGoogleVolumeId, fetchGoogleVolume } = vi.hoisted(() => ({
  findBookByGoogleVolumeId: vi.fn(),
  fetchGoogleVolume: vi.fn(),
}));

vi.mock("@/lib/books/repository", () => ({
  findBookByGoogleVolumeId,
}));

vi.mock("@/lib/books/google", () => ({
  fetchGoogleVolume,
}));

import {
  resolveBookDetail,
} from "@/lib/books/volume-details";

function createGoogleBook(
  overrides: Partial<NormalizedBook> = {},
): NormalizedBook {
  return {
    googleVolumeId: "volume-1",
    title: "Example Book",
    subtitle: null,
    authors: ["Example Author"],
    publisher: "Example Publisher",
    publishedDate: "2025",
    description: "<p>Example</p>",
    isbn10: null,
    isbn13: "9780000000000",
    pageCount: 320,
    categories: ["Fiction"],
    language: "en",
    thumbnailUrl: "https://books.google.com/thumbnail",
    previewLink: "https://books.google.com/preview",
    infoLink: "https://books.google.com/info",
    canonicalLink: "https://books.google.com/canonical",
    rawGoogleJson: {},
    ...overrides,
  };
}

function createStoredBook(overrides: Partial<BookRecord> = {}): BookRecord {
  return {
    id: "book-1",
    googleVolumeId: "volume-1",
    title: "Stored Book",
    subtitle: null,
    authors: ["Stored Author"],
    publisher: "Stored Publisher",
    publishedDate: "2024",
    description: "<p>Stored</p>",
    isbn10: null,
    isbn13: "9781111111111",
    pageCount: 240,
    categories: ["History"],
    language: "en",
    thumbnailUrl: "https://books.google.com/stored-thumbnail",
    previewLink: "https://books.google.com/stored-preview",
    infoLink: "https://books.google.com/stored-info",
    canonicalLink: "https://books.google.com/stored-canonical",
    rawGoogleJson: {},
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("volume detail resolver", () => {
  beforeEach(() => {
    findBookByGoogleVolumeId.mockReset();
    fetchGoogleVolume.mockReset();
  });

  it("returns a persisted detail from the DB before calling Google", async () => {
    findBookByGoogleVolumeId.mockResolvedValue(createStoredBook());

    const detail = await resolveBookDetail("volume-1");

    expect(detail).toMatchObject({
      googleVolumeId: "volume-1",
      title: "Stored Book",
      persisted: true,
    });
    expect(fetchGoogleVolume).not.toHaveBeenCalled();
  });

  it("checks the DB on each call so imported data stays authoritative", async () => {
    findBookByGoogleVolumeId.mockResolvedValue(createStoredBook());

    const first = await resolveBookDetail("volume-1");
    const second = await resolveBookDetail("volume-1");

    expect(first).toMatchObject({ persisted: true });
    expect(second).toEqual(first);
    expect(findBookByGoogleVolumeId).toHaveBeenCalledTimes(2);
    expect(fetchGoogleVolume).not.toHaveBeenCalled();
  });

  it("falls back to Google and marks uncached details as non-persisted", async () => {
    findBookByGoogleVolumeId.mockResolvedValue(null);
    fetchGoogleVolume.mockResolvedValue(createGoogleBook());

    const detail = await resolveBookDetail("volume-1");

    expect(detail).toMatchObject({
      googleVolumeId: "volume-1",
      title: "Example Book",
      persisted: false,
    });
    expect(fetchGoogleVolume).toHaveBeenCalledTimes(1);
  });

  it("prefers a newly imported DB record after an earlier Google fallback", async () => {
    findBookByGoogleVolumeId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createStoredBook());
    fetchGoogleVolume.mockResolvedValue(createGoogleBook());

    const googleDetail = await resolveBookDetail("volume-1");
    const storedDetail = await resolveBookDetail("volume-1");

    expect(googleDetail).toMatchObject({ persisted: false });
    expect(storedDetail).toMatchObject({
      title: "Stored Book",
      persisted: true,
    });
    expect(fetchGoogleVolume).toHaveBeenCalledTimes(1);
    expect(findBookByGoogleVolumeId).toHaveBeenCalledTimes(2);
  });
});

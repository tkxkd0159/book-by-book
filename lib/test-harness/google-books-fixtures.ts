import type { GoogleVolume } from "@/lib/books/google-api";
import { normalizeVolume } from "@/lib/books/google-normalization";
import type { NormalizedBook } from "@/lib/books/types";

function createGoogleVolumeFixture(input: {
  authors: string[];
  canonicalVolumeId?: string;
  categories: string[];
  description: string;
  googleVolumeId: string;
  infoLinkId?: string;
  isbn10?: string | null;
  isbn13?: string | null;
  language: string;
  pageCount: number;
  previewLinkId?: string | null;
  publishedDate: string;
  publisher: string;
  subtitle?: string | null;
  thumbnailId?: string;
  title: string;
}): GoogleVolume {
  const googleBooksId = input.infoLinkId ?? input.googleVolumeId;
  const thumbnailId = input.thumbnailId ?? input.googleVolumeId;
  const identifiers = [];

  if (input.isbn10) {
    identifiers.push({
      identifier: input.isbn10,
      type: "ISBN_10",
    });
  }

  if (input.isbn13) {
    identifiers.push({
      identifier: input.isbn13,
      type: "ISBN_13",
    });
  }

  return {
    id: input.googleVolumeId,
    selfLink: `https://www.googleapis.com/books/v1/volumes/${input.googleVolumeId}`,
    volumeInfo: {
      authors: [...input.authors],
      canonicalVolumeLink: `https://books.google.com/books?id=${input.canonicalVolumeId ?? googleBooksId}`,
      categories: [...input.categories],
      description: input.description,
      imageLinks: {
        smallThumbnail: `https://books.google.com/books/content?id=${thumbnailId}&printsec=frontcover&img=1&zoom=5`,
        thumbnail: `https://books.google.com/books/content?id=${thumbnailId}&printsec=frontcover&img=1&zoom=1`,
      },
      industryIdentifiers: identifiers,
      infoLink: `https://books.google.com/books?id=${googleBooksId}`,
      language: input.language,
      pageCount: input.pageCount,
      previewLink:
        input.previewLinkId === null
          ? undefined
          : `https://books.google.com/books?id=${input.previewLinkId ?? googleBooksId}&printsec=frontcover`,
      publishedDate: input.publishedDate,
      publisher: input.publisher,
      subtitle: input.subtitle ?? undefined,
      title: input.title,
    },
  };
}

function normalizeFixtureVolume(
  volume: GoogleVolume,
  name: string,
): NormalizedBook {
  const normalizedVolume = normalizeVolume(volume);
  if (!normalizedVolume) {
    throw new Error(`${name} must include a valid volumeInfo.title.`);
  }

  return normalizedVolume;
}

export const TEST_BOOK_FIXTURE_VOLUME = createGoogleVolumeFixture({
  authors: ["Fixture Author"],
  categories: ["Fiction"],
  description: "Fixture description for milestone 2 end-to-end coverage.",
  googleVolumeId: "club-test-book",
  isbn13: "9780000000002",
  language: "en",
  pageCount: 320,
  previewLinkId: null,
  publishedDate: "2025",
  publisher: "Book by Book Press",
  subtitle: "Milestone Fixture",
  thumbnailId: "fixture",
  title: "The Test-Driven Book Club",
});

export const E2E_SEARCH_RESULT_VOLUME = createGoogleVolumeFixture({
  authors: ["Roald Dahl"],
  categories: ["Fiction", "Children"],
  description:
    "A brilliant child discovers she can reshape the world around her.",
  googleVolumeId: "fixture-search-matilda",
  isbn10: "0142410373",
  isbn13: "9780140328721",
  language: "en",
  pageCount: 256,
  publishedDate: "2007",
  publisher: "Puffin Books",
  title: "Matilda",
});

export const TEST_BOOK_FIXTURE = normalizeFixtureVolume(
  TEST_BOOK_FIXTURE_VOLUME,
  "TEST_BOOK_FIXTURE_VOLUME",
);

export const E2E_SEARCH_RESULT_FIXTURE = normalizeFixtureVolume(
  E2E_SEARCH_RESULT_VOLUME,
  "E2E_SEARCH_RESULT_VOLUME",
);

export const TEST_BOOK_VOLUME_FIXTURES = [
  TEST_BOOK_FIXTURE_VOLUME,
  E2E_SEARCH_RESULT_VOLUME,
  createGoogleVolumeFixture({
    authors: ["J.K. Rowling"],
    categories: ["Fantasy"],
    description: "A young wizard discovers a hidden world at Hogwarts.",
    googleVolumeId: "fixture-search-harry-potter",
    isbn10: "059035342X",
    isbn13: "9780590353427",
    language: "en",
    pageCount: 320,
    publishedDate: "1998",
    publisher: "Scholastic",
    title: "Harry Potter and the Sorcerer's Stone",
  }),
  createGoogleVolumeFixture({
    authors: ["Carl Sagan"],
    categories: ["Science"],
    description: "Carl Sagan surveys the universe with clarity and wonder.",
    googleVolumeId: "fixture-search-cosmos",
    isbn10: "0345331354",
    isbn13: "9780345331357",
    language: "en",
    pageCount: 384,
    publishedDate: "1985",
    publisher: "Ballantine Books",
    subtitle: "A Personal Voyage",
    title: "Cosmos",
  }),
  createGoogleVolumeFixture({
    authors: ["Jane Austen"],
    categories: ["Classics", "Romance"],
    description:
      "Elizabeth Bennet and Mr. Darcy navigate pride, prejudice, and family expectations.",
    googleVolumeId: "fixture-search-pride-prejudice",
    isbn10: "0679783261",
    isbn13: "9780679783268",
    language: "en",
    pageCount: 279,
    publishedDate: "2000",
    publisher: "Modern Library",
    title: "Pride and Prejudice",
  }),
] as const satisfies readonly GoogleVolume[];

export const TEST_BOOK_CATALOG = TEST_BOOK_VOLUME_FIXTURES.map((volume, index) =>
  normalizeFixtureVolume(volume, `TEST_BOOK_VOLUME_FIXTURES[${index}]`),
);

export const TEST_BOOK_VOLUME_FIXTURES_BY_ID = new Map(
  TEST_BOOK_VOLUME_FIXTURES.map((volume) => [volume.id, volume] as const),
);

export const TEST_BOOK_CATALOG_BY_VOLUME_ID = new Map(
  TEST_BOOK_CATALOG.map((book) => [book.googleVolumeId, book] as const),
);

export const TEST_BOOK_VOLUME_ID = TEST_BOOK_FIXTURE.googleVolumeId;

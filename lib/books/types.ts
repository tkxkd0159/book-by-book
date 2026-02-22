type NormalizedBook = {
  googleVolumeId: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  publisher: string | null;
  publishedDate: string | null;
  description: string | null;
  isbn10: string | null;
  isbn13: string | null;
  pageCount: number | null;
  categories: string[];
  language: string | null;
  thumbnailUrl: string | null;
  previewLink: string | null;
  infoLink: string | null;
  canonicalLink: string | null;
  rawGoogleJson: unknown;
};

type BookSearchItem = Pick<
  NormalizedBook,
  | "googleVolumeId"
  | "title"
  | "subtitle"
  | "authors"
  | "publisher"
  | "publishedDate"
  | "thumbnailUrl"
  | "infoLink"
  | "previewLink"
>;

export type { BookSearchItem, NormalizedBook };

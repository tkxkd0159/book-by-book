type AuthUser = {
  id: string;
  provider: string;
  providerUserId: string;
  email: string | null;
  name: string | null;
  imageUrl: string | null;
};

type BookRecord = {
  id: string;
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
  createdAt: Date;
  updatedAt: Date;
};

export type { AuthUser, BookRecord };

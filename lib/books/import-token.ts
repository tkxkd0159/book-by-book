import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import { resolveAuthSecret } from "@/lib/auth/secret";
import type { BookDetail, NormalizedBook } from "@/lib/books/types";

const BOOK_IMPORT_TOKEN_VERSION = 1;
const BOOK_IMPORT_TOKEN_SEPARATOR = ".";

const bookImportPayloadSchema = z.object({
  v: z.literal(BOOK_IMPORT_TOKEN_VERSION),
  googleVolumeId: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().nullable(),
  authors: z.array(z.string()),
  publisher: z.string().nullable(),
  publishedDate: z.string().nullable(),
  description: z.string().nullable(),
  isbn10: z.string().nullable(),
  isbn13: z.string().nullable(),
  pageCount: z.number().int().nonnegative().nullable(),
  categories: z.array(z.string()),
  language: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  previewLink: z.string().nullable(),
  infoLink: z.string().nullable(),
  canonicalLink: z.string().nullable(),
});

type BookImportPayload = z.infer<typeof bookImportPayloadSchema>;

function createBookImportPayload(book: BookDetail): BookImportPayload {
  return {
    v: BOOK_IMPORT_TOKEN_VERSION,
    googleVolumeId: book.googleVolumeId,
    title: book.title,
    subtitle: book.subtitle,
    authors: book.authors,
    publisher: book.publisher,
    publishedDate: book.publishedDate,
    description: book.description,
    isbn10: book.isbn10,
    isbn13: book.isbn13,
    pageCount: book.pageCount,
    categories: book.categories,
    language: book.language,
    thumbnailUrl: book.thumbnailUrl,
    previewLink: book.previewLink,
    infoLink: book.infoLink,
    canonicalLink: book.canonicalLink,
  };
}

function signBookImportPayload(encodedPayload: string) {
  return createHmac("sha256", resolveAuthSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function decodeBookImportPayload(encodedPayload: string) {
  try {
    const rawPayload = Buffer.from(encodedPayload, "base64url").toString("utf8");
    return bookImportPayloadSchema.parse(JSON.parse(rawPayload));
  } catch {
    return null;
  }
}

export function createSignedBookImportToken(book: BookDetail) {
  const encodedPayload = Buffer.from(
    JSON.stringify(createBookImportPayload(book)),
    "utf8",
  ).toString("base64url");
  const signature = signBookImportPayload(encodedPayload);

  return `${encodedPayload}${BOOK_IMPORT_TOKEN_SEPARATOR}${signature}`;
}

export function readSignedBookImportToken(
  token: string | null | undefined,
  expectedGoogleVolumeId: string,
): NormalizedBook | null {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature, ...rest] = token.split(
    BOOK_IMPORT_TOKEN_SEPARATOR,
  );
  if (!encodedPayload || !signature || rest.length > 0) {
    return null;
  }

  const expectedSignature = signBookImportPayload(encodedPayload);
  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedSignatureBuffer = Buffer.from(expectedSignature, "utf8");

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    return null;
  }

  const payload = decodeBookImportPayload(encodedPayload);
  if (!payload || payload.googleVolumeId !== expectedGoogleVolumeId.trim()) {
    return null;
  }

  return {
    googleVolumeId: payload.googleVolumeId,
    title: payload.title,
    subtitle: payload.subtitle,
    authors: payload.authors,
    publisher: payload.publisher,
    publishedDate: payload.publishedDate,
    description: payload.description,
    isbn10: payload.isbn10,
    isbn13: payload.isbn13,
    pageCount: payload.pageCount,
    categories: payload.categories,
    language: payload.language,
    thumbnailUrl: payload.thumbnailUrl,
    previewLink: payload.previewLink,
    infoLink: payload.infoLink,
    canonicalLink: payload.canonicalLink,
    rawGoogleJson: null,
  };
}

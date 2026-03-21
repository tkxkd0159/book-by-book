import { formatBookDescription } from "@/lib/books/description";
import type { GoogleVolume } from "@/lib/books/google-api";
import type { BookSearchItem, NormalizedBook } from "@/lib/books/types";

function normalizeLink(link: string | undefined): string | null {
  if (!link) {
    return null;
  }

  return link.replace("http://", "https://");
}

function findIdentifier(
  identifiers: Array<{ type?: string; identifier?: string }> | undefined,
  targetType: "ISBN_10" | "ISBN_13",
) {
  return (
    identifiers?.find((item) => item.type === targetType)?.identifier?.trim() ??
    null
  );
}

export function normalizeVolume(volume: GoogleVolume): NormalizedBook | null {
  const volumeInfo = volume.volumeInfo;
  if (!volumeInfo?.title) {
    return null;
  }

  return {
    googleVolumeId: volume.id,
    title: volumeInfo.title,
    subtitle: volumeInfo.subtitle ?? null,
    authors: volumeInfo.authors ?? [],
    publisher: volumeInfo.publisher ?? null,
    publishedDate: volumeInfo.publishedDate ?? null,
    description: formatBookDescription(volumeInfo.description ?? null),
    isbn10: findIdentifier(volumeInfo.industryIdentifiers, "ISBN_10"),
    isbn13: findIdentifier(volumeInfo.industryIdentifiers, "ISBN_13"),
    pageCount: volumeInfo.pageCount ?? null,
    categories: volumeInfo.categories ?? [],
    language: volumeInfo.language ?? null,
    thumbnailUrl: normalizeLink(
      volumeInfo.imageLinks?.thumbnail ?? volumeInfo.imageLinks?.smallThumbnail,
    ),
    previewLink: normalizeLink(volumeInfo.previewLink),
    infoLink: normalizeLink(volumeInfo.infoLink),
    canonicalLink: normalizeLink(
      volumeInfo.canonicalVolumeLink ?? volume.selfLink,
    ),
    rawGoogleJson: volume,
  };
}

export function normalizeSearchResult(
  volume: GoogleVolume,
): BookSearchItem | null {
  const normalized = normalizeVolume(volume);
  if (!normalized) {
    return null;
  }

  return {
    googleVolumeId: normalized.googleVolumeId,
    title: normalized.title,
    subtitle: normalized.subtitle,
    authors: normalized.authors,
    publisher: normalized.publisher,
    publishedDate: normalized.publishedDate,
    thumbnailUrl: normalized.thumbnailUrl,
    infoLink: normalized.infoLink,
    previewLink: normalized.previewLink,
  };
}

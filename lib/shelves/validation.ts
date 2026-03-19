import { ShelfError } from "@/lib/shelves/errors";

const SHELF_NAME_MAX_LENGTH = 80;
const SHELF_DESCRIPTION_MAX_LENGTH = 400;
const SHELF_ITEM_NOTE_MAX_LENGTH = 1_000;

function readString(value: FormDataEntryValue | string | null | undefined) {
  return typeof value === "string" ? value : "";
}

function normalizeLineBreaks(value: string) {
  return value.replace(/\r\n?/g, "\n");
}

export function normalizeOptionalShelfText(
  value: FormDataEntryValue | string | null | undefined,
) {
  const normalized = readString(value).trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}

export function normalizeOptionalShelfBody(
  value: FormDataEntryValue | string | null | undefined,
) {
  const normalized = normalizeLineBreaks(readString(value)).trim();
  return normalized.length > 0 ? normalized : null;
}

export function parseShelfName(
  value: FormDataEntryValue | string | null | undefined,
) {
  const normalized = normalizeOptionalShelfText(value);
  if (!normalized) {
    throw new ShelfError("VALIDATION", "Shelf name is required.");
  }

  if (normalized.length > SHELF_NAME_MAX_LENGTH) {
    throw new ShelfError(
      "VALIDATION",
      `Shelf name must be ${SHELF_NAME_MAX_LENGTH} characters or fewer.`,
    );
  }

  return normalized;
}

export function parseShelfDescription(
  value: FormDataEntryValue | string | null | undefined,
) {
  const normalized = normalizeOptionalShelfText(value);
  if (!normalized) {
    return null;
  }

  if (normalized.length > SHELF_DESCRIPTION_MAX_LENGTH) {
    throw new ShelfError(
      "VALIDATION",
      `Shelf description must be ${SHELF_DESCRIPTION_MAX_LENGTH} characters or fewer.`,
    );
  }

  return normalized;
}

export function parseShelfIsPublic(
  value: FormDataEntryValue | string | null | undefined,
) {
  const normalized = readString(value).trim().toLowerCase();
  if (
    normalized === "true" ||
    normalized === "on" ||
    normalized === "1" ||
    normalized === "public"
  ) {
    return true;
  }

  if (
    normalized === "false" ||
    normalized === "off" ||
    normalized === "0" ||
    normalized === "private" ||
    normalized === ""
  ) {
    return false;
  }

  throw new ShelfError("VALIDATION", "Choose a valid shelf visibility.");
}

export function parseShelfItemNote(
  value: FormDataEntryValue | string | null | undefined,
) {
  const normalized = normalizeOptionalShelfBody(value);
  if (!normalized) {
    return null;
  }

  if (normalized.length > SHELF_ITEM_NOTE_MAX_LENGTH) {
    throw new ShelfError(
      "VALIDATION",
      `Shelf note must be ${SHELF_ITEM_NOTE_MAX_LENGTH} characters or fewer.`,
    );
  }

  return normalized;
}

export function parseShelfId(
  value: FormDataEntryValue | string | null | undefined,
  label = "Shelf",
) {
  const normalized = readString(value).trim();
  if (!normalized) {
    throw new ShelfError("VALIDATION", `${label} is required.`);
  }

  return normalized;
}

export function parseSafeReturnTo(
  value: FormDataEntryValue | string | null | undefined,
  fallback: string,
) {
  const normalized = readString(value).trim();
  if (!normalized || !normalized.startsWith("/") || normalized.startsWith("//")) {
    return fallback;
  }

  return normalized;
}

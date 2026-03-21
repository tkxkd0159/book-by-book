"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { requireCurrentUser } from "@/lib/auth/server";
import { readSignedBookImportToken } from "@/lib/books/import-token";
import { ensureBookInDatabase } from "@/lib/books/repository";
import {
  enforceMutationRateLimit,
  isMutationRateLimitError,
} from "@/lib/rate-limit/mutation";
import { isShelfError } from "@/lib/shelves/errors";
import {
  addBookToShelf,
  createShelf,
  deleteShelf,
  listManageableShelfBookTargetsForGoogleVolumeId,
  removeShelfItem,
  updateShelf,
  updateShelfItemNote,
} from "@/lib/shelves/repository";
import {
  parseSafeReturnTo,
  parseShelfDescription,
  parseShelfId,
  parseShelfIsPublic,
  parseShelfItemNote,
  parseShelfName,
} from "@/lib/shelves/validation";
import {
  createMyShelfHref,
  createMyShelvesHref,
  createNewShelfHref,
  createPublicShelfHref,
} from "@/lib/shelves/view-paths";

const SHELF_ACTION_MESSAGES = {
  created: "Shelf created.",
  updated: "Shelf updated.",
  deleted: "Shelf deleted.",
  noteSaved: "Shelf note saved.",
  bookRemoved: "Book removed from shelf.",
  unexpectedError: "Something went wrong. Please try again.",
} as const;

function appendMessage(pathname: string, key: string, value: string) {
  const url = new URL(pathname, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}

function getErrorMessage(error: unknown) {
  if (isShelfError(error) || isMutationRateLimitError(error)) {
    return error.message;
  }

  console.error(error);
  return SHELF_ACTION_MESSAGES.unexpectedError;
}

function rethrowIfRedirect(error: unknown) {
  if (isRedirectError(error)) {
    throw error;
  }
}

function pluralize(label: string, count: number) {
  if (label === "shelf") {
    return `${count} ${count === 1 ? "shelf" : "shelves"}`;
  }

  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function readOptionalString(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function revalidateShelfPaths(input: {
  publicNickname: string | null;
  shelfId?: string;
}) {
  revalidatePath("/me");
  revalidatePath(createMyShelvesHref());
  revalidatePath(createNewShelfHref());

  if (!input.shelfId) {
    return;
  }

  revalidatePath(createMyShelfHref(input.shelfId));
  if (input.publicNickname) {
    revalidatePath(
      createPublicShelfHref({
        nickname: input.publicNickname,
        shelfId: input.shelfId,
      }),
    );
  }
}

function revalidateBookPaths(googleVolumeId: string) {
  revalidatePath("/books/search");
  revalidatePath(`/books/${encodeURIComponent(googleVolumeId)}`);
}

export async function createShelfAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const name = parseShelfName(formData.get("name"));
  const description = parseShelfDescription(formData.get("description"));
  const isPublic = parseShelfIsPublic(formData.get("isPublic"));

  try {
    const shelf = await createShelf({
      userId: currentUser.id,
      name,
      description,
      isPublic,
    });

    revalidateShelfPaths({
      publicNickname: currentUser.nickname,
      shelfId: shelf.id,
    });

    redirect(
      appendMessage(
        createMyShelfHref(shelf.id),
        "message",
        SHELF_ACTION_MESSAGES.created,
      ),
    );
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(
      appendMessage(
        createNewShelfHref(),
        "error",
        getErrorMessage(error),
      ),
    );
  }
}

export async function updateShelfAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const shelfId = parseShelfId(formData.get("shelfId"));
  const name = parseShelfName(formData.get("name"));
  const description = parseShelfDescription(formData.get("description"));
  const isPublic = parseShelfIsPublic(formData.get("isPublic"));
  const returnTo = parseSafeReturnTo(
    formData.get("returnTo"),
    createMyShelfHref(shelfId),
  );

  try {
    await updateShelf({
      shelfId,
      userId: currentUser.id,
      name,
      description,
      isPublic,
    });

    revalidateShelfPaths({
      publicNickname: currentUser.nickname,
      shelfId,
    });

    redirect(
      appendMessage(returnTo, "message", SHELF_ACTION_MESSAGES.updated),
    );
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(appendMessage(returnTo, "error", getErrorMessage(error)));
  }
}

export async function deleteShelfAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const shelfId = parseShelfId(formData.get("shelfId"));
  const returnTo = parseSafeReturnTo(
    formData.get("returnTo"),
    createMyShelfHref(shelfId),
  );

  try {
    revalidateShelfPaths({
      publicNickname: currentUser.nickname,
      shelfId,
    });

    await deleteShelf({
      shelfId,
      userId: currentUser.id,
    });

    redirect(
      appendMessage(
        createMyShelvesHref(),
        "message",
        SHELF_ACTION_MESSAGES.deleted,
      ),
    );
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(appendMessage(returnTo, "error", getErrorMessage(error)));
  }
}

export async function addBookToShelvesFromVolumeAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const googleVolumeId = parseShelfId(
    formData.get("googleVolumeId"),
    "Google volume",
  );
  const bookImportToken = readOptionalString(formData.get("bookImportToken"));
  const returnTo = parseSafeReturnTo(
    formData.get("returnTo"),
    `/books/${encodeURIComponent(googleVolumeId)}`,
  );
  const selectedShelfIds = Array.from(
    new Set(
      formData
        .getAll("shelfId")
        .map((shelfId) => parseShelfId(shelfId))
        .filter((shelfId) => shelfId.length > 0),
    ),
  );

  if (selectedShelfIds.length === 0) {
    redirect(
      appendMessage(
        returnTo,
        "error",
        "Select at least one shelf to add this book.",
      ),
    );
  }

  try {
    await enforceMutationRateLimit({
      action: "add-book",
      userId: currentUser.id,
    });

    const book = await ensureBookInDatabase(googleVolumeId, {
      prefetchedBook: readSignedBookImportToken(
        bookImportToken,
        googleVolumeId,
      ),
    });

    if (!book) {
      redirect(appendMessage(returnTo, "error", "Book not found."));
    }

    const targets = await listManageableShelfBookTargetsForGoogleVolumeId(
      currentUser.id,
      googleVolumeId,
    );
    const targetsByShelfId = new Map(
      targets.map((target) => [target.shelfId, target]),
    );
    const eligibleShelfIds = selectedShelfIds.filter((shelfId) => {
      const target = targetsByShelfId.get(shelfId);
      return target && !target.alreadyAdded;
    });
    const skippedCount = selectedShelfIds.length - eligibleShelfIds.length;

    if (eligibleShelfIds.length === 0) {
      redirect(
        appendMessage(
          returnTo,
          "error",
          "This book can no longer be added to the selected shelves.",
        ),
      );
    }

    await Promise.all(
      eligibleShelfIds.map(async (shelfId) => {
        await addBookToShelf({
          shelfId,
          bookId: book.id,
          addedById: currentUser.id,
        });
        revalidateShelfPaths({
          publicNickname: currentUser.nickname,
          shelfId,
        });
      }),
    );

    revalidateBookPaths(book.googleVolumeId);
    const addedCount = eligibleShelfIds.length;
    const message =
      skippedCount > 0
        ? `Book added to ${pluralize("shelf", addedCount)}. ${pluralize(
            "selection",
            skippedCount,
          )} already had this book.`
        : `Book added to ${pluralize("shelf", addedCount)}.`;

    redirect(appendMessage(returnTo, "message", message));
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(appendMessage(returnTo, "error", getErrorMessage(error)));
  }
}

export async function updateShelfItemNoteAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const shelfId = parseShelfId(formData.get("shelfId"));
  const bookId = parseShelfId(formData.get("bookId"), "Book");
  const returnTo = parseSafeReturnTo(
    formData.get("returnTo"),
    createMyShelfHref(shelfId),
  );
  const note = parseShelfItemNote(formData.get("note"));

  try {
    await updateShelfItemNote({
      shelfId,
      bookId,
      userId: currentUser.id,
      note,
    });

    revalidateShelfPaths({
      publicNickname: currentUser.nickname,
      shelfId,
    });

    redirect(
      appendMessage(returnTo, "message", SHELF_ACTION_MESSAGES.noteSaved),
    );
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(appendMessage(returnTo, "error", getErrorMessage(error)));
  }
}

export async function removeShelfItemAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const shelfId = parseShelfId(formData.get("shelfId"));
  const bookId = parseShelfId(formData.get("bookId"), "Book");
  const returnTo = parseSafeReturnTo(
    formData.get("returnTo"),
    createMyShelfHref(shelfId),
  );

  try {
    await removeShelfItem({
      shelfId,
      bookId,
      userId: currentUser.id,
    });

    revalidateShelfPaths({
      publicNickname: currentUser.nickname,
      shelfId,
    });

    redirect(
      appendMessage(returnTo, "message", SHELF_ACTION_MESSAGES.bookRemoved),
    );
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(appendMessage(returnTo, "error", getErrorMessage(error)));
  }
}

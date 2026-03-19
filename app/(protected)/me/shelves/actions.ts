"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { requireCurrentUser } from "@/lib/auth/server";
import { isShelfError } from "@/lib/shelves/errors";
import {
  createShelf,
  deleteShelf,
  updateShelf,
} from "@/lib/shelves/repository";
import {
  parseSafeReturnTo,
  parseShelfDescription,
  parseShelfId,
  parseShelfIsPublic,
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
  unexpectedError: "Something went wrong. Please try again.",
} as const;

function appendMessage(pathname: string, key: string, value: string) {
  const url = new URL(pathname, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}

function getErrorMessage(error: unknown) {
  if (isShelfError(error)) {
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

function revalidateShelfPaths(input: { userId: string; shelfId?: string }) {
  revalidatePath("/me");
  revalidatePath(createMyShelvesHref());
  revalidatePath(createNewShelfHref());

  if (!input.shelfId) {
    return;
  }

  revalidatePath(createMyShelfHref(input.shelfId));
  revalidatePath(
    createPublicShelfHref({
      userId: input.userId,
      shelfId: input.shelfId,
    }),
  );
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
      userId: currentUser.id,
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
      userId: currentUser.id,
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
      userId: currentUser.id,
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

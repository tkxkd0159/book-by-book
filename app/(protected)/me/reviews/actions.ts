"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { requireCurrentUser } from "@/lib/auth/server";
import { readSignedBookImportToken } from "@/lib/books/import-token";
import { ensureBookInDatabase, findBookByGoogleVolumeId } from "@/lib/books/repository";
import { isReviewError } from "@/lib/reviews/errors";
import { deleteReview, upsertReview } from "@/lib/reviews/repository";
import {
  parseReviewBody,
  parseReviewGoogleVolumeId,
  parseReviewRating,
  parseReviewTitle,
  parseSafeReturnTo,
} from "@/lib/reviews/validation";
import {
  createMyReviewedHref,
  createMyReviewHref,
} from "@/lib/reviews/view-paths";

const REVIEW_ACTION_MESSAGES = {
  saved: "Review saved.",
  deleted: "Review deleted.",
  bookNotFound: "Book not found.",
  unexpectedError: "Something went wrong. Please try again.",
} as const;

function appendMessage(pathname: string, key: string, value: string) {
  const url = new URL(pathname, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}

function readOptionalString(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function rethrowIfRedirect(error: unknown) {
  if (isRedirectError(error)) {
    throw error;
  }
}

function getErrorMessage(error: unknown) {
  if (isReviewError(error)) {
    return error.message;
  }

  console.error(error);
  return REVIEW_ACTION_MESSAGES.unexpectedError;
}

function revalidateReviewPaths(googleVolumeId: string) {
  const detailPath = `/books/${encodeURIComponent(googleVolumeId)}`;

  for (const path of new Set([
    "/me",
    createMyReviewedHref(),
    createMyReviewHref(googleVolumeId).split("#", 1)[0] ?? detailPath,
    detailPath,
  ])) {
    revalidatePath(path);
  }
}

export async function upsertReviewAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  let returnTo = createMyReviewedHref();

  try {
    const googleVolumeId = parseReviewGoogleVolumeId(
      formData.get("googleVolumeId"),
    );
    returnTo = parseSafeReturnTo(
      formData.get("returnTo"),
      createMyReviewHref(googleVolumeId),
    );
    const rating = parseReviewRating(formData.get("rating"));
    const title = parseReviewTitle(formData.get("title"));
    const body = parseReviewBody(formData.get("body"));
    const bookImportToken = readOptionalString(formData.get("bookImportToken"));

    const book = await ensureBookInDatabase(googleVolumeId, {
      prefetchedBook: readSignedBookImportToken(
        bookImportToken,
        googleVolumeId,
      ),
    });

    if (!book) {
      redirect(
        appendMessage(returnTo, "error", REVIEW_ACTION_MESSAGES.bookNotFound),
      );
    }

    await upsertReview({
      userId: currentUser.id,
      bookId: book.id,
      rating,
      title,
      body,
    });

    revalidateReviewPaths(googleVolumeId);
    redirect(
      appendMessage(returnTo, "message", REVIEW_ACTION_MESSAGES.saved),
    );
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(appendMessage(returnTo, "error", getErrorMessage(error)));
  }
}

export async function deleteReviewAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  let returnTo = createMyReviewedHref();

  try {
    const googleVolumeId = parseReviewGoogleVolumeId(
      formData.get("googleVolumeId"),
    );
    returnTo = parseSafeReturnTo(
      formData.get("returnTo"),
      createMyReviewHref(googleVolumeId),
    );

    const book = await findBookByGoogleVolumeId(googleVolumeId);
    if (!book) {
      redirect(
        appendMessage(returnTo, "error", REVIEW_ACTION_MESSAGES.bookNotFound),
      );
    }

    await deleteReview({
      userId: currentUser.id,
      bookId: book.id,
    });

    revalidateReviewPaths(googleVolumeId);
    redirect(
      appendMessage(returnTo, "message", REVIEW_ACTION_MESSAGES.deleted),
    );
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(appendMessage(returnTo, "error", getErrorMessage(error)));
  }
}

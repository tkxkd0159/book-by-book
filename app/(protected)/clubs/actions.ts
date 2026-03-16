"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { ensureBookInDatabase } from "@/lib/books/repository";
import { ClubError, isClubError } from "@/lib/clubs/errors";
import {
  acceptClubInvitation,
  addBookToClub,
  createClub,
  createClubInvitation,
  joinPublicClub,
  moveClubBook,
  removeClubBook,
  revokeClubInvitation,
} from "@/lib/clubs/repository";
import { createThread } from "@/lib/threads/repository";
import {
  createThreadPost,
  deleteThreadPost,
  editThreadPost,
  pinThread,
  unpinThread,
} from "@/lib/threads/repository";
import { isThreadError } from "@/lib/threads/errors";
import {
  parseClubBookStatus,
  parseClubDescription,
  parseClubName,
  parseClubVisibility,
  parseInternalId,
  parseInvitationEmail,
  parseSafeReturnTo,
} from "@/lib/clubs/validation";
import { requireCurrentUser } from "@/lib/auth/server";
import {
  parseThreadBody,
  parseThreadPostBody,
  parseThreadTitle,
} from "@/lib/threads/validation";

function appendMessage(pathname: string, key: string, value: string) {
  const [path, existingQuery = ""] = pathname.split("?");
  const params = new URLSearchParams(existingQuery);
  params.set(key, value);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function getErrorMessage(error: unknown) {
  if (isClubError(error) || isThreadError(error)) {
    return error.message;
  }

  console.error(error);
  return "Something went wrong. Please try again.";
}

function rethrowIfRedirect(error: unknown) {
  if (isRedirectError(error)) {
    throw error;
  }
}

export async function createClubAction(formData: FormData) {
  const currentUser = await requireCurrentUser();

  try {
    const club = await createClub({
      createdById: currentUser.id,
      name: parseClubName(formData.get("name")),
      description: parseClubDescription(formData.get("description")),
      visibility: parseClubVisibility(formData.get("visibility")),
    });

    revalidatePath("/clubs");
    redirect(
      appendMessage(`/clubs/${club.id}`, "message", "Club created successfully."),
    );
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(appendMessage("/clubs/new", "error", getErrorMessage(error)));
  }
}

export async function joinClubAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const clubId = parseInternalId(formData.get("clubId"), "Club");
  const returnTo = parseSafeReturnTo(formData.get("returnTo"), `/clubs/${clubId}`);

  try {
    await joinPublicClub({ clubId, userId: currentUser.id });
    revalidatePath("/clubs");
    revalidatePath(`/clubs/${clubId}`);
    redirect(appendMessage(returnTo, "message", "You joined the club."));
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(appendMessage(returnTo, "error", getErrorMessage(error)));
  }
}

export async function createInvitationAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const clubId = parseInternalId(formData.get("clubId"), "Club");

  try {
    const { rawToken } = await createClubInvitation({
      clubId,
      invitedById: currentUser.id,
      invitedEmail: parseInvitationEmail(formData.get("invitedEmail")),
    });

    revalidatePath(`/clubs/${clubId}/invite`);
    redirect(
      appendMessage(
        appendMessage(`/clubs/${clubId}/invite`, "message", "Invite created."),
        "token",
        rawToken,
      ),
    );
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(
      appendMessage(`/clubs/${clubId}/invite`, "error", getErrorMessage(error)),
    );
  }
}

export async function revokeInvitationAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const clubId = parseInternalId(formData.get("clubId"), "Club");
  const invitationId = parseInternalId(formData.get("invitationId"), "Invitation");

  try {
    await revokeClubInvitation({
      clubId,
      invitationId,
      revokedById: currentUser.id,
    });
    revalidatePath(`/clubs/${clubId}/invite`);
    redirect(
      appendMessage(`/clubs/${clubId}/invite`, "message", "Invite revoked."),
    );
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(
      appendMessage(`/clubs/${clubId}/invite`, "error", getErrorMessage(error)),
    );
  }
}

export async function acceptInvitationAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const token = parseInternalId(formData.get("token"), "Invitation token");

  try {
    const result = await acceptClubInvitation({ token, user: currentUser });
    revalidatePath("/clubs");
    revalidatePath(`/clubs/${result.clubId}`);
    redirect(
      appendMessage(`/clubs/${result.clubId}`, "message", "Invitation accepted."),
    );
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(
      appendMessage(
        `/clubs/invitations/${encodeURIComponent(token)}`,
        "error",
        getErrorMessage(error),
      ),
    );
  }
}

export async function addBookToClubAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const clubId = parseInternalId(formData.get("clubId"), "Club");
  const bookId = parseInternalId(formData.get("bookId"), "Book");
  const returnTo = parseSafeReturnTo(formData.get("returnTo"), `/clubs/${clubId}`);

  try {
    await addBookToClub({
      clubId,
      bookId,
      addedById: currentUser.id,
      status: parseClubBookStatus(formData.get("status")),
    });
    revalidatePath(`/clubs/${clubId}`);
    redirect(appendMessage(returnTo, "message", "Book added to the club."));
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(appendMessage(returnTo, "error", getErrorMessage(error)));
  }
}

export async function moveClubBookAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const clubId = parseInternalId(formData.get("clubId"), "Club");
  const clubBookId = parseInternalId(formData.get("clubBookId"), "Club book");

  try {
    await moveClubBook({
      clubId,
      clubBookId,
      movedById: currentUser.id,
      status: parseClubBookStatus(formData.get("status")),
    });
    revalidatePath(`/clubs/${clubId}`);
    redirect(appendMessage(`/clubs/${clubId}`, "message", "Book moved."));
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(
      appendMessage(`/clubs/${clubId}`, "error", getErrorMessage(error)),
    );
  }
}

export async function removeClubBookAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const clubId = parseInternalId(formData.get("clubId"), "Club");
  const clubBookId = parseInternalId(formData.get("clubBookId"), "Club book");

  try {
    await removeClubBook({
      clubId,
      clubBookId,
      removedById: currentUser.id,
    });
    revalidatePath(`/clubs/${clubId}`);
    redirect(appendMessage(`/clubs/${clubId}`, "message", "Book removed."));
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(
      appendMessage(`/clubs/${clubId}`, "error", getErrorMessage(error)),
    );
  }
}

export async function addBookToClubFromVolumeAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const clubId = parseInternalId(formData.get("clubId"), "Club");
  const googleVolumeId = parseInternalId(
    formData.get("googleVolumeId"),
    "Google volume",
  );
  const returnTo = parseSafeReturnTo(
    formData.get("returnTo"),
    `/books/${encodeURIComponent(googleVolumeId)}`,
  );

  try {
    const book = await ensureBookInDatabase(googleVolumeId);
    if (!book) {
      throw new ClubError("NOT_FOUND", "Book not found.");
    }

    await addBookToClub({
      clubId,
      bookId: book.id,
      addedById: currentUser.id,
      status: parseClubBookStatus(formData.get("status")),
    });

    revalidatePath(`/clubs/${clubId}`);
    revalidatePath(`/books/${encodeURIComponent(googleVolumeId)}`);
    redirect(appendMessage(returnTo, "message", "Book added to the club."));
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(appendMessage(returnTo, "error", getErrorMessage(error)));
  }
}

export async function createThreadAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const clubId = parseInternalId(formData.get("clubId"), "Club");
  const clubBookId = parseInternalId(formData.get("clubBookId"), "Club book");
  const returnTo = parseSafeReturnTo(
    formData.get("returnTo"),
    `/clubs/${clubId}/books/${clubBookId}`,
  );

  try {
    await createThread({
      clubId,
      clubBookId,
      authorId: currentUser.id,
      title: parseThreadTitle(formData.get("title")),
      body: parseThreadBody(formData.get("body")),
    });

    revalidatePath(`/clubs/${clubId}/books/${clubBookId}`);
    redirect(appendMessage(returnTo, "message", "Thread created."));
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(appendMessage(returnTo, "error", getErrorMessage(error)));
  }
}

export async function createThreadPostAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const clubId = parseInternalId(formData.get("clubId"), "Club");
  const threadId = parseInternalId(formData.get("threadId"), "Thread");
  const returnTo = parseSafeReturnTo(
    formData.get("returnTo"),
    `/clubs/${clubId}/threads/${threadId}`,
  );

  try {
    await createThreadPost({
      clubId,
      threadId,
      authorId: currentUser.id,
      body: parseThreadPostBody(formData.get("body")),
    });

    revalidatePath(`/clubs/${clubId}/threads/${threadId}`);
    redirect(appendMessage(returnTo, "message", "Post created."));
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(appendMessage(returnTo, "error", getErrorMessage(error)));
  }
}

export async function editThreadPostAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const clubId = parseInternalId(formData.get("clubId"), "Club");
  const threadId = parseInternalId(formData.get("threadId"), "Thread");
  const postId = parseInternalId(formData.get("postId"), "Post");
  const returnTo = parseSafeReturnTo(
    formData.get("returnTo"),
    `/clubs/${clubId}/threads/${threadId}`,
  );

  try {
    await editThreadPost({
      clubId,
      postId,
      editorId: currentUser.id,
      body: parseThreadPostBody(formData.get("body")),
    });

    revalidatePath(`/clubs/${clubId}/threads/${threadId}`);
    redirect(appendMessage(returnTo, "message", "Post updated."));
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(appendMessage(returnTo, "error", getErrorMessage(error)));
  }
}

export async function deleteThreadPostAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const clubId = parseInternalId(formData.get("clubId"), "Club");
  const threadId = parseInternalId(formData.get("threadId"), "Thread");
  const postId = parseInternalId(formData.get("postId"), "Post");
  const returnTo = parseSafeReturnTo(
    formData.get("returnTo"),
    `/clubs/${clubId}/threads/${threadId}`,
  );

  try {
    await deleteThreadPost({
      clubId,
      postId,
      deletedById: currentUser.id,
    });

    revalidatePath(`/clubs/${clubId}/threads/${threadId}`);
    redirect(appendMessage(returnTo, "message", "Post deleted."));
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(appendMessage(returnTo, "error", getErrorMessage(error)));
  }
}

export async function toggleThreadPinAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const clubId = parseInternalId(formData.get("clubId"), "Club");
  const clubBookId = parseInternalId(formData.get("clubBookId"), "Club book");
  const threadId = parseInternalId(formData.get("threadId"), "Thread");
  const intent = readString(formData.get("intent"));
  const returnTo = parseSafeReturnTo(
    formData.get("returnTo"),
    `/clubs/${clubId}/books/${clubBookId}`,
  );

  try {
    if (intent === "unpin") {
      await unpinThread({
        clubId,
        threadId,
        unpinnedById: currentUser.id,
      });
    } else {
      await pinThread({
        clubId,
        threadId,
        pinnedById: currentUser.id,
      });
    }

    revalidatePath(`/clubs/${clubId}/books/${clubBookId}`);
    revalidatePath(`/clubs/${clubId}/threads/${threadId}`);
    redirect(
      appendMessage(
        returnTo,
        "message",
        intent === "unpin" ? "Thread unpinned." : "Thread pinned.",
      ),
    );
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(appendMessage(returnTo, "error", getErrorMessage(error)));
  }
}

function readString(value: FormDataEntryValue | string | null | undefined) {
  return typeof value === "string" ? value : "";
}

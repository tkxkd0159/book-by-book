"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { ensureBookInDatabase } from "@/lib/books/repository";
import { ClubError, isClubError } from "@/lib/clubs/errors";
import {
  acceptClubInvitation,
  addBookToClub,
  changeClubMemberRole,
  createClub,
  createClubInvitation,
  deleteClub,
  joinPublicClub,
  leaveClub,
  listManageableClubBookTargetsForGoogleVolumeId,
  moveClubBook,
  removeClubMember,
  removeClubBook,
  revokeClubInvitation,
  transferClubOwnership,
} from "@/lib/clubs/repository";
import { createThread } from "@/lib/threads/repository";
import {
  createThreadPost,
  deleteThread,
  deleteThreadPost,
  editThreadPost,
  pinThread,
  unpinThread,
} from "@/lib/threads/repository";
import { isThreadError } from "@/lib/threads/errors";
import {
  parseClubBookStatus,
  parseClubDescription,
  parseManageableClubMemberRole,
  parseClubName,
  parseClubVisibility,
  parseInternalId,
  parseInvitationEmail,
  parseSafeReturnTo,
} from "@/lib/clubs/validation";
import { requireCurrentUser } from "@/lib/auth/server";
import {
  enforceMutationRateLimit,
  isMutationRateLimitError,
} from "@/lib/rate-limit/mutation";
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
  if (
    isClubError(error) ||
    isThreadError(error) ||
    isMutationRateLimitError(error)
  ) {
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

function pluralize(label: string, count: number) {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function revalidateReturnTo(returnTo: string) {
  const path = returnTo.split("?")[0] ?? returnTo;
  revalidatePath(path);
}

function revalidateClubPages(clubId: string) {
  revalidatePath(`/clubs/${clubId}`);
  revalidatePath(`/clubs/${clubId}/manage`);
}

export async function createClubAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const name = parseClubName(formData.get("name"));
  const description = parseClubDescription(formData.get("description"));
  const visibility = parseClubVisibility(formData.get("visibility"));

  try {
    await enforceMutationRateLimit({
      action: "create-club",
      userId: currentUser.id,
    });

    const club = await createClub({
      createdById: currentUser.id,
      name,
      description,
      visibility,
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
    revalidateClubPages(clubId);
    redirect(appendMessage(returnTo, "message", "You joined the club."));
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(appendMessage(returnTo, "error", getErrorMessage(error)));
  }
}

export async function leaveClubAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const clubId = parseInternalId(formData.get("clubId"), "Club");
  const returnTo = parseSafeReturnTo(formData.get("returnTo"), `/clubs/${clubId}`);

  try {
    await leaveClub({
      clubId,
      userId: currentUser.id,
    });
    revalidatePath("/clubs");
    revalidateClubPages(clubId);
    redirect(appendMessage("/clubs", "message", "You left the club."));
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(appendMessage(returnTo, "error", getErrorMessage(error)));
  }
}

export async function changeClubMemberRoleAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const clubId = parseInternalId(formData.get("clubId"), "Club");
  const targetUserId = parseInternalId(formData.get("targetUserId"), "Member");
  const nextRole = parseManageableClubMemberRole(formData.get("nextRole"));
  const returnTo = parseSafeReturnTo(
    formData.get("returnTo"),
    `/clubs/${clubId}/manage?tab=members`,
  );

  try {
    await changeClubMemberRole({
      clubId,
      targetUserId,
      changedById: currentUser.id,
      nextRole,
    });
    revalidatePath("/clubs");
    revalidateClubPages(clubId);
    revalidateReturnTo(returnTo);
    redirect(appendMessage(returnTo, "message", "Member role updated."));
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(appendMessage(returnTo, "error", getErrorMessage(error)));
  }
}

export async function removeClubMemberAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const clubId = parseInternalId(formData.get("clubId"), "Club");
  const targetUserId = parseInternalId(formData.get("targetUserId"), "Member");
  const returnTo = parseSafeReturnTo(
    formData.get("returnTo"),
    `/clubs/${clubId}/manage?tab=members`,
  );

  try {
    await removeClubMember({
      clubId,
      targetUserId,
      removedById: currentUser.id,
    });
    revalidatePath("/clubs");
    revalidateClubPages(clubId);
    revalidateReturnTo(returnTo);
    redirect(appendMessage(returnTo, "message", "Member removed."));
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(appendMessage(returnTo, "error", getErrorMessage(error)));
  }
}

export async function transferClubOwnershipAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const clubId = parseInternalId(formData.get("clubId"), "Club");
  const nextOwnerUserId = parseInternalId(
    formData.get("nextOwnerUserId"),
    "Next owner",
  );
  const returnTo = parseSafeReturnTo(
    formData.get("returnTo"),
    `/clubs/${clubId}/manage?tab=members`,
  );

  try {
    await transferClubOwnership({
      clubId,
      nextOwnerUserId,
      transferredById: currentUser.id,
    });
    revalidatePath("/clubs");
    revalidateClubPages(clubId);
    revalidateReturnTo(returnTo);
    redirect(appendMessage(returnTo, "message", "Ownership transferred."));
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(appendMessage(returnTo, "error", getErrorMessage(error)));
  }
}

export async function deleteClubAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const clubId = parseInternalId(formData.get("clubId"), "Club");
  const returnTo = parseSafeReturnTo(formData.get("returnTo"), `/clubs/${clubId}`);

  try {
    await deleteClub({
      clubId,
      deletedById: currentUser.id,
    });
    revalidatePath("/clubs");
    redirect(appendMessage("/clubs", "message", "Club deleted."));
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(appendMessage(returnTo, "error", getErrorMessage(error)));
  }
}

export async function createInvitationAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const clubId = parseInternalId(formData.get("clubId"), "Club");
  const returnTo = parseSafeReturnTo(
    formData.get("returnTo"),
    `/clubs/${clubId}/manage?tab=invite`,
  );

  try {
    const { rawToken } = await createClubInvitation({
      clubId,
      invitedById: currentUser.id,
      invitedEmail: parseInvitationEmail(formData.get("invitedEmail")),
    });

    revalidateClubPages(clubId);
    revalidateReturnTo(returnTo);
    redirect(
      appendMessage(
        appendMessage(returnTo, "message", "Invite created."),
        "token",
        rawToken,
      ),
    );
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(appendMessage(returnTo, "error", getErrorMessage(error)));
  }
}

export async function revokeInvitationAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const clubId = parseInternalId(formData.get("clubId"), "Club");
  const invitationId = parseInternalId(formData.get("invitationId"), "Invitation");
  const returnTo = parseSafeReturnTo(
    formData.get("returnTo"),
    `/clubs/${clubId}/manage?tab=invite`,
  );

  try {
    await revokeClubInvitation({
      clubId,
      invitationId,
      revokedById: currentUser.id,
    });
    revalidateClubPages(clubId);
    revalidateReturnTo(returnTo);
    redirect(appendMessage(returnTo, "message", "Invite revoked."));
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(appendMessage(returnTo, "error", getErrorMessage(error)));
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
  const status = parseClubBookStatus(formData.get("status"));
  const returnTo = parseSafeReturnTo(formData.get("returnTo"), `/clubs/${clubId}`);

  try {
    await enforceMutationRateLimit({
      action: "add-book",
      userId: currentUser.id,
    });

    await addBookToClub({
      clubId,
      bookId,
      addedById: currentUser.id,
      status,
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
  const returnTo = parseSafeReturnTo(
    formData.get("returnTo"),
    `/clubs/${clubId}/manage?tab=board`,
  );

  try {
    await moveClubBook({
      clubId,
      clubBookId,
      movedById: currentUser.id,
      status: parseClubBookStatus(formData.get("status")),
    });
    revalidateClubPages(clubId);
    revalidateReturnTo(returnTo);
    redirect(appendMessage(returnTo, "message", "Book moved."));
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(appendMessage(returnTo, "error", getErrorMessage(error)));
  }
}

export async function removeClubBookAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const clubId = parseInternalId(formData.get("clubId"), "Club");
  const clubBookId = parseInternalId(formData.get("clubBookId"), "Club book");
  const returnTo = parseSafeReturnTo(
    formData.get("returnTo"),
    `/clubs/${clubId}/manage?tab=board`,
  );

  try {
    await removeClubBook({
      clubId,
      clubBookId,
      removedById: currentUser.id,
    });
    revalidateClubPages(clubId);
    revalidateReturnTo(returnTo);
    redirect(appendMessage(returnTo, "message", "Book removed."));
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(appendMessage(returnTo, "error", getErrorMessage(error)));
  }
}

export async function addBookToClubsFromVolumeAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const googleVolumeId = parseInternalId(
    formData.get("googleVolumeId"),
    "Google volume",
  );
  const returnTo = parseSafeReturnTo(
    formData.get("returnTo"),
    `/books/${encodeURIComponent(googleVolumeId)}`,
  );
  const selectedClubIds = Array.from(
    new Set(
      formData
        .getAll("clubId")
        .map((clubId) => parseInternalId(clubId, "Club"))
        .filter((clubId) => clubId.length > 0),
    ),
  );

  if (selectedClubIds.length === 0) {
    redirect(
      appendMessage(returnTo, "error", "Select at least one club to add this book."),
    );
  }

  try {
    await enforceMutationRateLimit({
      action: "add-book",
      userId: currentUser.id,
    });

    const book = await ensureBookInDatabase(googleVolumeId);
    if (!book) {
      throw new ClubError("NOT_FOUND", "Book not found.");
    }

    const targets = await listManageableClubBookTargetsForGoogleVolumeId(
      currentUser.id,
      googleVolumeId,
    );
    const targetsByClubId = new Map(
      targets.map((target) => [target.clubId, target]),
    );
    const eligibleClubIds = selectedClubIds.filter((clubId) => {
      const target = targetsByClubId.get(clubId);
      return target && !target.alreadyAdded;
    });
    const skippedCount = selectedClubIds.length - eligibleClubIds.length;

    if (eligibleClubIds.length === 0) {
      redirect(
        appendMessage(
          returnTo,
          "error",
          "This book can no longer be added to the selected clubs.",
        ),
      );
    }

    await Promise.all(
      eligibleClubIds.map(async (clubId) => {
        await addBookToClub({
          clubId,
          bookId: book.id,
          addedById: currentUser.id,
          status: "WANT_TO_READ",
        });
        revalidatePath(`/clubs/${clubId}`);
      }),
    );

    revalidateReturnTo(returnTo);
    revalidatePath("/books/search");
    revalidatePath(`/books/${encodeURIComponent(book.googleVolumeId)}`);

    const addedCount = eligibleClubIds.length;
    const message =
      skippedCount > 0
        ? `Book added to ${pluralize("club", addedCount)}. ${pluralize(
            "selection",
            skippedCount,
          )} already had this book.`
        : `Book added to ${pluralize("club", addedCount)}.`;

    redirect(appendMessage(returnTo, "message", message));
  } catch (error) {
    rethrowIfRedirect(error);
    redirect(appendMessage(returnTo, "error", getErrorMessage(error)));
  }
}

export async function createThreadAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const clubId = parseInternalId(formData.get("clubId"), "Club");
  const clubBookId = parseInternalId(formData.get("clubBookId"), "Club book");
  const title = parseThreadTitle(formData.get("title"));
  const body = parseThreadBody(formData.get("body"));
  const returnTo = parseSafeReturnTo(
    formData.get("returnTo"),
    `/clubs/${clubId}/books/${clubBookId}`,
  );

  try {
    await enforceMutationRateLimit({
      action: "start-thread",
      userId: currentUser.id,
    });

    await createThread({
      clubId,
      clubBookId,
      authorId: currentUser.id,
      title,
      body,
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

export async function deleteThreadAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const clubId = parseInternalId(formData.get("clubId"), "Club");
  const clubBookId = parseInternalId(formData.get("clubBookId"), "Club book");
  const threadId = parseInternalId(formData.get("threadId"), "Thread");
  const returnTo = parseSafeReturnTo(
    formData.get("returnTo"),
    `/clubs/${clubId}/threads/${threadId}`,
  );
  const discussionPath = `/clubs/${clubId}/books/${clubBookId}`;

  try {
    await deleteThread({
      clubId,
      threadId,
      deletedById: currentUser.id,
    });

    revalidatePath(discussionPath);
    revalidatePath(`/clubs/${clubId}/threads/${threadId}`);
    redirect(appendMessage(discussionPath, "message", "Thread deleted."));
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

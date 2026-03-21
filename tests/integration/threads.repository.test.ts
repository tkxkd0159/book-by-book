import { beforeEach, describe, expect, it } from "vitest";

import sql from "@/lib/db";
import { E2E_USER_PROVIDER } from "@/lib/auth/e2e";
import { findUserByProviderIdentity } from "@/lib/auth/users";
import {
  addBookToClub,
  createClub,
  joinPublicClub,
  moveClubBook,
  removeClubBook,
} from "@/lib/clubs/repository";
import { findBookByGoogleVolumeId } from "@/lib/books/repository";
import { resetTestDatabase, TEST_BOOK_VOLUME_ID } from "@/tests/support/fixtures";
import { ThreadError } from "@/lib/threads/errors";
import {
  createThread,
  createThreadPost,
  deleteThread,
  deleteThreadPost,
  editThreadPost,
  findDiscussionClubBook,
  findThreadDetail,
  listThreadsForClubBook,
  pinThread,
  unpinThread,
} from "@/lib/threads/repository";
import type { AuthUser } from "@/types/db";

async function getRequiredUser(key: string): Promise<AuthUser> {
  const user = await findUserByProviderIdentity(E2E_USER_PROVIDER, key);

  if (!user) {
    throw new Error(`Expected seeded user for key ${key}`);
  }

  return user;
}

beforeEach(async () => {
  await resetTestDatabase();
});

describe("thread repository integration", () => {
  it("creates threads only for active club books and orders pinned threads first", async () => {
    const owner = await getRequiredUser("owner");
    const member = await getRequiredUser("member");
    const book = await findBookByGoogleVolumeId(TEST_BOOK_VOLUME_ID);

    expect(book).toBeTruthy();

    const club = await createClub({
      createdById: owner.id,
      name: "Discussion Club",
      description: null,
      visibility: "PUBLIC",
    });

    await joinPublicClub({
      clubId: club.id,
      userId: member.id,
    });

    const clubBook = await addBookToClub({
      clubId: club.id,
      bookId: book!.id,
      addedById: owner.id,
      status: "READING",
    });

    const firstThread = await createThread({
      clubId: club.id,
      clubBookId: clubBook.id,
      authorId: member.id,
      title: "First thread",
      body: "Started by a member.",
    });
    const secondThread = await createThread({
      clubId: club.id,
      clubBookId: clubBook.id,
      authorId: owner.id,
      title: "Second thread",
      body: null,
    });

    await pinThread({
      clubId: club.id,
      threadId: firstThread.id,
      pinnedById: owner.id,
    });

    const listed = await listThreadsForClubBook({
      clubId: club.id,
      clubBookId: clubBook.id,
      userId: member.id,
    });

    expect(listed.items.map((thread) => thread.id)).toEqual([
      firstThread.id,
      secondThread.id,
    ]);
    expect(listed.items[0]?.isPinned).toBe(true);
    expect(listed.hasMore).toBe(false);
    expect(listed.nextCursor).toBeNull();

    const discussionContext = await findDiscussionClubBook({
      clubId: club.id,
      clubBookId: clubBook.id,
      userId: member.id,
    });
    expect(discussionContext.clubBook.book.googleVolumeId).toBe(
      TEST_BOOK_VOLUME_ID,
    );

    await unpinThread({
      clubId: club.id,
      threadId: firstThread.id,
      unpinnedById: owner.id,
    });
  });

  it("rejects malformed thread and comment cursors", async () => {
    const owner = await getRequiredUser("owner");
    const book = await findBookByGoogleVolumeId(TEST_BOOK_VOLUME_ID);

    const club = await createClub({
      createdById: owner.id,
      name: "Cursor Validation Club",
      description: null,
      visibility: "PUBLIC",
    });

    const clubBook = await addBookToClub({
      clubId: club.id,
      bookId: book!.id,
      addedById: owner.id,
      status: "READING",
    });

    const thread = await createThread({
      clubId: club.id,
      clubBookId: clubBook.id,
      authorId: owner.id,
      title: "Cursor validation thread",
      body: null,
    });

    await expect(
      listThreadsForClubBook({
        clubId: club.id,
        clubBookId: clubBook.id,
        userId: owner.id,
        afterCursor: "not-a-cursor",
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION",
      message: "Cursor is invalid.",
    } satisfies Partial<ThreadError>);

    await expect(
      findThreadDetail({
        clubId: club.id,
        threadId: thread.id,
        userId: owner.id,
        afterCursor: "also-not-a-cursor",
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION",
      message: "Cursor is invalid.",
    } satisfies Partial<ThreadError>);
  });

  it("rejects new thread creation after a club book is archived but still exposes existing discussion", async () => {
    const owner = await getRequiredUser("owner");
    const member = await getRequiredUser("member");
    const book = await findBookByGoogleVolumeId(TEST_BOOK_VOLUME_ID);

    expect(book).toBeTruthy();

    const club = await createClub({
      createdById: owner.id,
      name: "Archived Discussion Club",
      description: null,
      visibility: "PUBLIC",
    });

    await joinPublicClub({
      clubId: club.id,
      userId: member.id,
    });

    const clubBook = await addBookToClub({
      clubId: club.id,
      bookId: book!.id,
      addedById: owner.id,
      status: "WANT_TO_READ",
    });

    const thread = await createThread({
      clubId: club.id,
      clubBookId: clubBook.id,
      authorId: member.id,
      title: "Archive-safe thread",
      body: "This should stay visible.",
    });

    await removeClubBook({
      clubId: club.id,
      clubBookId: clubBook.id,
      removedById: owner.id,
    });

    await expect(
      createThread({
        clubId: club.id,
        clubBookId: clubBook.id,
        authorId: member.id,
        title: "Should not work",
        body: null,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Archived club books cannot accept new threads.",
    } satisfies Partial<ThreadError>);

    const listed = await listThreadsForClubBook({
      clubId: club.id,
      clubBookId: clubBook.id,
      userId: owner.id,
    });
    expect(listed.items).toHaveLength(1);
    expect(listed.items[0]?.id).toBe(thread.id);

    const detail = await findThreadDetail({
      clubId: club.id,
      threadId: thread.id,
      userId: owner.id,
    });
    expect(detail.thread.clubBook.removedAt).toBeTruthy();
  });

  it("restricts post edit and delete to the author while keeping deleted posts in the timeline", async () => {
    const owner = await getRequiredUser("owner");
    const member = await getRequiredUser("member");
    const book = await findBookByGoogleVolumeId(TEST_BOOK_VOLUME_ID);

    const club = await createClub({
      createdById: owner.id,
      name: "Post Permission Club",
      description: null,
      visibility: "PUBLIC",
    });

    await joinPublicClub({
      clubId: club.id,
      userId: member.id,
    });

    const clubBook = await addBookToClub({
      clubId: club.id,
      bookId: book!.id,
      addedById: owner.id,
      status: "READING",
    });

    const thread = await createThread({
      clubId: club.id,
      clubBookId: clubBook.id,
      authorId: owner.id,
      title: "Talking through chapter one",
      body: null,
    });

    const post = await createThreadPost({
      clubId: club.id,
      threadId: thread.id,
      authorId: member.id,
      body: "My initial reaction.",
    });

    await expect(
      editThreadPost({
        clubId: club.id,
        postId: post.id,
        editorId: owner.id,
        body: "Trying to edit someone else's post.",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Only the post author can modify this post.",
    } satisfies Partial<ThreadError>);

    const edited = await editThreadPost({
      clubId: club.id,
      postId: post.id,
      editorId: member.id,
      body: "My updated reaction.",
    });
    expect(edited.body).toBe("My updated reaction.");

    await expect(
      deleteThreadPost({
        clubId: club.id,
        postId: post.id,
        deletedById: owner.id,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Only the post author can modify this post.",
    } satisfies Partial<ThreadError>);

    const deleted = await deleteThreadPost({
      clubId: club.id,
      postId: post.id,
      deletedById: member.id,
    });
    expect(deleted.deletedAt).toBeTruthy();

    const detail = await findThreadDetail({
      clubId: club.id,
      threadId: thread.id,
      userId: member.id,
    });
    expect(detail.posts.items[0]?.id).toBe(post.id);
    expect(detail.posts.items[0]?.deletedAt).toBeTruthy();
    expect(detail.posts.items[0]?.replies).toEqual([]);
    expect(detail.posts.hasMore).toBe(false);
    expect(detail.posts.nextCursor).toBeNull();
  });

  it("supports one-depth replies and keeps child replies visible after a parent is deleted", async () => {
    const owner = await getRequiredUser("owner");
    const member = await getRequiredUser("member");
    const book = await findBookByGoogleVolumeId(TEST_BOOK_VOLUME_ID);

    const club = await createClub({
      createdById: owner.id,
      name: "Reply Depth Club",
      description: null,
      visibility: "PUBLIC",
    });

    await joinPublicClub({
      clubId: club.id,
      userId: member.id,
    });

    const clubBook = await addBookToClub({
      clubId: club.id,
      bookId: book!.id,
      addedById: owner.id,
      status: "READING",
    });

    const thread = await createThread({
      clubId: club.id,
      clubBookId: clubBook.id,
      authorId: owner.id,
      title: "Reply depth thread",
      body: null,
    });

    const parentPost = await createThreadPost({
      clubId: club.id,
      threadId: thread.id,
      authorId: member.id,
      body: "Top-level thought.",
    });
    const childReply = await createThreadPost({
      clubId: club.id,
      threadId: thread.id,
      authorId: owner.id,
      body: "Child reply.",
      parentPostId: parentPost.id,
    });

    expect(childReply.parentPostId).toBe(parentPost.id);

    await expect(
      createThreadPost({
        clubId: club.id,
        threadId: thread.id,
        authorId: member.id,
        body: "Too deep.",
        parentPostId: childReply.id,
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "Replies can only target top-level posts.",
    } satisfies Partial<ThreadError>);

    const secondThread = await createThread({
      clubId: club.id,
      clubBookId: clubBook.id,
      authorId: owner.id,
      title: "Another thread",
      body: null,
    });
    const secondThreadPost = await createThreadPost({
      clubId: club.id,
      threadId: secondThread.id,
      authorId: owner.id,
      body: "Wrong thread parent.",
    });

    await expect(
      createThreadPost({
        clubId: club.id,
        threadId: thread.id,
        authorId: member.id,
        body: "Wrong target.",
        parentPostId: secondThreadPost.id,
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Reply target not found.",
    } satisfies Partial<ThreadError>);

    const detailBeforeDelete = await findThreadDetail({
      clubId: club.id,
      threadId: thread.id,
      userId: member.id,
    });
    expect(detailBeforeDelete.thread.postCount).toBe(2);
    expect(detailBeforeDelete.posts.items[0]?.body).toBe("Top-level thought.");
    expect(
      detailBeforeDelete.posts.items[0]?.replies.map((reply) => reply.body),
    ).toEqual(["Child reply."]);

    await deleteThreadPost({
      clubId: club.id,
      postId: parentPost.id,
      deletedById: member.id,
    });

    await expect(
      createThreadPost({
        clubId: club.id,
        threadId: thread.id,
        authorId: owner.id,
        body: "Late reply.",
        parentPostId: parentPost.id,
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "Deleted posts cannot accept replies.",
    } satisfies Partial<ThreadError>);

    const detailAfterDelete = await findThreadDetail({
      clubId: club.id,
      threadId: thread.id,
      userId: owner.id,
    });
    expect(detailAfterDelete.thread.postCount).toBe(2);
    expect(detailAfterDelete.posts.items[0]?.deletedAt).toBeTruthy();
    expect(detailAfterDelete.posts.items[0]?.replies[0]?.id).toBe(
      childReply.id,
    );
  });

  it("restricts pinning to club admins and paginates thread and post queries deterministically", async () => {
    const owner = await getRequiredUser("owner");
    const member = await getRequiredUser("member");
    const book = await findBookByGoogleVolumeId(TEST_BOOK_VOLUME_ID);

    const club = await createClub({
      createdById: owner.id,
      name: "Pagination Club",
      description: null,
      visibility: "PUBLIC",
    });

    await joinPublicClub({
      clubId: club.id,
      userId: member.id,
    });

    const clubBook = await addBookToClub({
      clubId: club.id,
      bookId: book!.id,
      addedById: owner.id,
      status: "READING",
    });

    const threads = [];
    for (const title of ["Thread One", "Thread Two", "Thread Three"]) {
      threads.push(
        await createThread({
          clubId: club.id,
          clubBookId: clubBook.id,
          authorId: owner.id,
          title,
          body: null,
        }),
      );
    }

    await expect(
      pinThread({
        clubId: club.id,
        threadId: threads[0]!.id,
        pinnedById: member.id,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Only club admins can pin threads.",
    } satisfies Partial<ThreadError>);

    await pinThread({
      clubId: club.id,
      threadId: threads[1]!.id,
      pinnedById: owner.id,
    });

    const firstPage = await listThreadsForClubBook({
      clubId: club.id,
      clubBookId: clubBook.id,
      userId: owner.id,
      limit: 2,
    });
    const secondPage = await listThreadsForClubBook({
      clubId: club.id,
      clubBookId: clubBook.id,
      userId: owner.id,
      afterCursor: firstPage.nextCursor,
      limit: 2,
    });

    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.items[0]?.id).toBe(threads[1]!.id);
    expect(firstPage.hasMore).toBe(true);
    expect(firstPage.nextCursor).toBeTruthy();
    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.items[0]?.id).toBe(threads[0]!.id);
    expect(secondPage.hasMore).toBe(false);
    expect(secondPage.nextCursor).toBeNull();

    const topLevelPosts = [];
    for (const body of ["Post One", "Post Two", "Post Three"]) {
      topLevelPosts.push(
        await createThreadPost({
          clubId: club.id,
          threadId: threads[1]!.id,
          authorId: member.id,
          body,
        }),
      );
    }

    const firstReply = await createThreadPost({
      clubId: club.id,
      threadId: threads[1]!.id,
      authorId: owner.id,
      body: "Reply to Post One",
      parentPostId: topLevelPosts[0]?.id,
    });
    expect(firstReply.parentPostId).toBeTruthy();

    const detailPageOne = await findThreadDetail({
      clubId: club.id,
      threadId: threads[1]!.id,
      userId: owner.id,
      limit: 2,
    });
    const detailPageTwo = await findThreadDetail({
      clubId: club.id,
      threadId: threads[1]!.id,
      userId: owner.id,
      afterCursor: detailPageOne.posts.nextCursor,
      limit: 2,
    });

    expect(detailPageOne.thread.postCount).toBe(4);
    expect(detailPageOne.posts.items.map((post) => post.body)).toEqual([
      "Post One",
      "Post Two",
    ]);
    expect(
      detailPageOne.posts.items[0]?.replies.map((reply) => reply.body),
    ).toEqual(["Reply to Post One"]);
    expect(detailPageOne.posts.items[1]?.replies).toEqual([]);
    expect(detailPageTwo.posts.items.map((post) => post.body)).toEqual([
      "Post Three",
    ]);
    expect(detailPageOne.posts.hasMore).toBe(true);
    expect(detailPageOne.posts.nextCursor).toBeTruthy();
    expect(detailPageTwo.posts.hasMore).toBe(false);
    expect(detailPageTwo.posts.nextCursor).toBeNull();
  });

  it("lets club admins delete threads and cascades related posts", async () => {
    const owner = await getRequiredUser("owner");
    const member = await getRequiredUser("member");
    const stranger = await getRequiredUser("stranger");
    const book = await findBookByGoogleVolumeId(TEST_BOOK_VOLUME_ID);

    const club = await createClub({
      createdById: owner.id,
      name: "Thread Moderation Club",
      description: null,
      visibility: "PUBLIC",
    });

    await joinPublicClub({
      clubId: club.id,
      userId: member.id,
    });
    await joinPublicClub({
      clubId: club.id,
      userId: stranger.id,
    });

    await sql`
      update bookapp.club_members
      set role = 'ADMIN'
      where club_id = ${club.id}::uuid
        and user_id = ${member.id}::uuid
    `;

    const clubBook = await addBookToClub({
      clubId: club.id,
      bookId: book!.id,
      addedById: owner.id,
      status: "READING",
    });

    const thread = await createThread({
      clubId: club.id,
      clubBookId: clubBook.id,
      authorId: owner.id,
      title: "Moderation target",
      body: "This thread will be deleted.",
    });

    await createThreadPost({
      clubId: club.id,
      threadId: thread.id,
      authorId: owner.id,
      body: "Opening post.",
    });
    await createThreadPost({
      clubId: club.id,
      threadId: thread.id,
      authorId: member.id,
      body: "Moderator reply.",
    });

    await expect(
      deleteThread({
        clubId: club.id,
        threadId: thread.id,
        deletedById: stranger.id,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Only club admins can delete threads.",
    } satisfies Partial<ThreadError>);

    const deleted = await deleteThread({
      clubId: club.id,
      threadId: thread.id,
      deletedById: member.id,
    });
    expect(deleted.id).toBe(thread.id);

    const [{ remainingPosts }] = await sql<{ remainingPosts: number }[]>`
      select count(*)::int as "remainingPosts"
      from bookapp.thread_posts
      where thread_id = ${thread.id}::uuid
    `;
    expect(remainingPosts).toBe(0);

    const listed = await listThreadsForClubBook({
      clubId: club.id,
      clubBookId: clubBook.id,
      userId: owner.id,
    });
    expect(listed.items).toHaveLength(0);

    await expect(
      findThreadDetail({
        clubId: club.id,
        threadId: thread.id,
        userId: owner.id,
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Thread not found.",
    } satisfies Partial<ThreadError>);
  });

  it("blocks thread reads for non-members", async () => {
    const owner = await getRequiredUser("owner");
    const stranger = await getRequiredUser("stranger");
    const book = await findBookByGoogleVolumeId(TEST_BOOK_VOLUME_ID);

    const club = await createClub({
      createdById: owner.id,
      name: "Private Discussion Club",
      description: null,
      visibility: "PUBLIC",
    });

    const clubBook = await addBookToClub({
      clubId: club.id,
      bookId: book!.id,
      addedById: owner.id,
      status: "READING",
    });

    const thread = await createThread({
      clubId: club.id,
      clubBookId: clubBook.id,
      authorId: owner.id,
      title: "Members only thread",
      body: null,
    });

    await expect(
      listThreadsForClubBook({
        clubId: club.id,
        clubBookId: clubBook.id,
        userId: stranger.id,
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Club book discussion not found.",
    } satisfies Partial<ThreadError>);

    await expect(
      findThreadDetail({
        clubId: club.id,
        threadId: thread.id,
        userId: stranger.id,
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Thread not found.",
    } satisfies Partial<ThreadError>);
  });

  it("keeps archived club books readable after status changes", async () => {
    const owner = await getRequiredUser("owner");
    const member = await getRequiredUser("member");
    const book = await findBookByGoogleVolumeId(TEST_BOOK_VOLUME_ID);

    const club = await createClub({
      createdById: owner.id,
      name: "Archive After Move Club",
      description: null,
      visibility: "PUBLIC",
    });

    await joinPublicClub({
      clubId: club.id,
      userId: member.id,
    });

    const clubBook = await addBookToClub({
      clubId: club.id,
      bookId: book!.id,
      addedById: owner.id,
      status: "WANT_TO_READ",
    });

    await moveClubBook({
      clubId: club.id,
      clubBookId: clubBook.id,
      movedById: owner.id,
      status: "READING",
    });

    const thread = await createThread({
      clubId: club.id,
      clubBookId: clubBook.id,
      authorId: member.id,
      title: "Still around after move",
      body: null,
    });

    await removeClubBook({
      clubId: club.id,
      clubBookId: clubBook.id,
      removedById: owner.id,
    });

    const detail = await findThreadDetail({
      clubId: club.id,
      threadId: thread.id,
      userId: member.id,
    });

    expect(detail.thread.clubBook.status).toBe("READING");
    expect(detail.thread.clubBook.removedAt).toBeTruthy();
  });
});

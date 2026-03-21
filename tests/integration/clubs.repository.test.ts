import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import { findUserByProviderIdentity } from "@/lib/auth/users";
import {
  acceptClubInvitation,
  addBookToClub,
  addBooksToClub,
  changeClubMemberRole,
  createClub,
  createClubInvitation,
  deleteClub,
  findClubDetail,
  findInvitationByToken,
  joinPublicClub,
  leaveClub,
  listClubBooks,
  listClubMembers,
  listManageableClubBookTargetsByGoogleVolumeIds,
  listShelfImportSourcesForClub,
  listDiscoverablePublicClubs,
  listUserClubs,
  moveClubBook,
  removeClubMember,
  removeClubBook,
  transferClubOwnership,
} from "@/lib/clubs/repository";
import { E2E_USER_PROVIDER } from "@/lib/test-harness/auth";
import {
  resetTestDatabase,
  TEST_BOOK_VOLUME_ID,
} from "@/lib/test-harness/fixtures";
import { findBookByGoogleVolumeId, upsertBook } from "@/lib/books/repository";
import { addBookToShelf, createShelf } from "@/lib/shelves/repository";
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

describe("club repository integration", () => {
  it("supports create, join, invite, and section management", async () => {
    const owner = await getRequiredUser("owner");
    const member = await getRequiredUser("member");
    const book = await findBookByGoogleVolumeId(TEST_BOOK_VOLUME_ID);

    expect(book, "Expected seeded fixture book.").toBeTruthy();

    const publicClub = await createClub({
      createdById: owner.id,
      name: "Repository Public Club",
      description: "Integration flow",
      visibility: "PUBLIC",
    });

    const joinedMembership = await joinPublicClub({
      clubId: publicClub.id,
      userId: member.id,
    });
    expect(joinedMembership.role).toBe("MEMBER");

    const detail = await findClubDetail(publicClub.id, member.id);
    expect(detail?.currentUserRole).toBe("MEMBER");
    expect(detail?.memberCount).toBe(2);

    const clubBook = await addBookToClub({
      clubId: publicClub.id,
      bookId: book!.id,
      addedById: owner.id,
      status: "WANT_TO_READ",
    });
    expect(clubBook.status).toBe("WANT_TO_READ");

    const movedBook = await moveClubBook({
      clubId: publicClub.id,
      clubBookId: clubBook.id,
      movedById: owner.id,
      status: "READING",
    });
    expect(movedBook.status).toBe("READING");

    const activeBooks = await listClubBooks(publicClub.id);
    expect(activeBooks).toHaveLength(1);
    expect(activeBooks[0]?.book.googleVolumeId).toBe(TEST_BOOK_VOLUME_ID);
    expect(activeBooks[0]?.status).toBe("READING");

    await removeClubBook({
      clubId: publicClub.id,
      clubBookId: clubBook.id,
      removedById: owner.id,
    });
    const afterRemoval = await listClubBooks(publicClub.id);
    expect(afterRemoval).toHaveLength(0);
  });

  it("accepts a private invitation for the targeted user", async () => {
    const owner = await getRequiredUser("owner");
    const member = await getRequiredUser("member");

    const privateClub = await createClub({
      createdById: owner.id,
      name: "Repository Private Club",
      description: null,
      visibility: "PRIVATE",
    });

    const invitationResult = await createClubInvitation({
      clubId: privateClub.id,
      invitedById: owner.id,
      invitedNickname: member.nickname ?? "",
    });

    const lookup = await findInvitationByToken(invitationResult.rawToken);
    expect(lookup?.invitedNickname).toBe(member.nickname);
    expect(lookup?.invitedUserId).toBe(member.id);
    expect(lookup?.effectiveStatus).toBe("PENDING");

    const accepted = await acceptClubInvitation({
      token: invitationResult.rawToken,
      user: member,
    });

    expect(accepted.clubId).toBe(privateClub.id);

    const memberClubDetail = await findClubDetail(privateClub.id, member.id);
    expect(memberClubDetail?.currentUserRole).toBe("MEMBER");
    expect(memberClubDetail?.memberCount).toBe(2);

    const updatedLookup = await findInvitationByToken(invitationResult.rawToken);
    expect(updatedLookup?.effectiveStatus).toBe("ACCEPTED");
  });

  it("updates member counts when members leave or are removed", async () => {
    const owner = await getRequiredUser("owner");
    const member = await getRequiredUser("member");
    const stranger = await getRequiredUser("stranger");

    const club = await createClub({
      createdById: owner.id,
      name: "Member Count Club",
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

    expect((await findClubDetail(club.id, owner.id))?.memberCount).toBe(3);

    await leaveClub({
      clubId: club.id,
      userId: member.id,
    });

    expect((await findClubDetail(club.id, owner.id))?.memberCount).toBe(2);

    await removeClubMember({
      clubId: club.id,
      targetUserId: stranger.id,
      removedById: owner.id,
    });

    expect((await findClubDetail(club.id, owner.id))?.memberCount).toBe(1);
  });

  it("rejects accepting a private invitation with the wrong account", async () => {
    const owner = await getRequiredUser("owner");
    const member = await getRequiredUser("member");
    const stranger = await getRequiredUser("stranger");

    const privateClub = await createClub({
      createdById: owner.id,
      name: "Wrong Account Club",
      description: null,
      visibility: "PRIVATE",
    });

    const invitationResult = await createClubInvitation({
      clubId: privateClub.id,
      invitedById: owner.id,
      invitedNickname: member.nickname ?? "",
    });

    await expect(
      acceptClubInvitation({
        token: invitationResult.rawToken,
        user: stranger,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "This invitation is for a different reader.",
    });

    const strangerClubs = await listUserClubs(stranger.id);
    expect(strangerClubs).toHaveLength(0);

    const invitationLookup = await findInvitationByToken(invitationResult.rawToken);
    expect(invitationLookup?.effectiveStatus).toBe("PENDING");
    expect(invitationLookup?.invitedUserId).toBe(member.id);
  });

  it("hides private clubs from public discovery for non-members", async () => {
    const owner = await getRequiredUser("owner");
    const stranger = await getRequiredUser("stranger");

    await createClub({
      createdById: owner.id,
      name: "Public Discovery Club",
      description: "Visible in discovery",
      visibility: "PUBLIC",
    });
    await createClub({
      createdById: owner.id,
      name: "Hidden Private Club",
      description: "Should not appear in discovery",
      visibility: "PRIVATE",
    });

    const discoverableClubs = await listDiscoverablePublicClubs(stranger.id);

    expect(discoverableClubs).toHaveLength(1);
    expect(discoverableClubs[0]?.name).toBe("Public Discovery Club");
    expect(discoverableClubs.map((club) => club.name)).not.toContain(
      "Hidden Private Club",
    );
  });

  it("rejects club book mutations from non-admin members", async () => {
    const owner = await getRequiredUser("owner");
    const member = await getRequiredUser("member");
    const book = await findBookByGoogleVolumeId(TEST_BOOK_VOLUME_ID);

    expect(book, "Expected seeded fixture book.").toBeTruthy();

    const club = await createClub({
      createdById: owner.id,
      name: "Permission Boundaries Club",
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

    await expect(
      addBookToClub({
        clubId: club.id,
        bookId: book!.id,
        addedById: member.id,
        status: "READING",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Only club admins can manage books.",
    });

    await expect(
      moveClubBook({
        clubId: club.id,
        clubBookId: clubBook.id,
        movedById: member.id,
        status: "READING",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Only club admins can manage books.",
    });

    await expect(
      removeClubBook({
        clubId: club.id,
        clubBookId: clubBook.id,
        removedById: member.id,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Only club admins can manage books.",
    });

    const remainingBooks = await listClubBooks(club.id);
    expect(remainingBooks).toHaveLength(1);
    expect(remainingBooks[0]?.status).toBe("WANT_TO_READ");
  });

  it("reports manageable club targets for active, inactive, and missing club books", async () => {
    const owner = await getRequiredUser("owner");
    const book = await findBookByGoogleVolumeId(TEST_BOOK_VOLUME_ID);

    expect(book, "Expected seeded fixture book.").toBeTruthy();

    const activeClub = await createClub({
      createdById: owner.id,
      name: "Active Club",
      description: null,
      visibility: "PUBLIC",
    });
    const removedClub = await createClub({
      createdById: owner.id,
      name: "Removed Club",
      description: null,
      visibility: "PUBLIC",
    });
    await createClub({
      createdById: owner.id,
      name: "Empty Club",
      description: null,
      visibility: "PUBLIC",
    });

    await addBookToClub({
      clubId: activeClub.id,
      bookId: book!.id,
      addedById: owner.id,
      status: "READING",
    });

    const removedClubBook = await addBookToClub({
      clubId: removedClub.id,
      bookId: book!.id,
      addedById: owner.id,
      status: "READ",
    });

    await removeClubBook({
      clubId: removedClub.id,
      clubBookId: removedClubBook.id,
      removedById: owner.id,
    });

    const targetsByVolumeId = await listManageableClubBookTargetsByGoogleVolumeIds(
      owner.id,
      [TEST_BOOK_VOLUME_ID, "missing-google-volume-id"],
    );

    expect(targetsByVolumeId[TEST_BOOK_VOLUME_ID]).toEqual([
      {
        clubId: activeClub.id,
        clubName: "Active Club",
        currentUserRole: "OWNER",
        alreadyAdded: true,
        existingStatus: "READING",
      },
      {
        clubId: expect.any(String),
        clubName: "Empty Club",
        currentUserRole: "OWNER",
        alreadyAdded: false,
        existingStatus: null,
      },
      {
        clubId: removedClub.id,
        clubName: "Removed Club",
        currentUserRole: "OWNER",
        alreadyAdded: false,
        existingStatus: null,
      },
    ]);

    expect(targetsByVolumeId["missing-google-volume-id"]).toEqual([
      {
        clubId: activeClub.id,
        clubName: "Active Club",
        currentUserRole: "OWNER",
        alreadyAdded: false,
        existingStatus: null,
      },
      {
        clubId: expect.any(String),
        clubName: "Empty Club",
        currentUserRole: "OWNER",
        alreadyAdded: false,
        existingStatus: null,
      },
      {
        clubId: removedClub.id,
        clubName: "Removed Club",
        currentUserRole: "OWNER",
        alreadyAdded: false,
        existingStatus: null,
      },
    ]);
  });

  it("lists owned shelf books that are still importable into a club", async () => {
    const owner = await getRequiredUser("owner");
    const fixtureBook = await findBookByGoogleVolumeId(TEST_BOOK_VOLUME_ID);

    expect(fixtureBook, "Expected seeded fixture book.").toBeTruthy();

    const extraBook = await upsertBook({
      googleVolumeId: "importable-extra-volume",
      title: "Importable Extra Book",
      subtitle: null,
      authors: ["Extra Author"],
      publisher: "Extra Publisher",
      publishedDate: "2025",
      description: null,
      isbn10: null,
      isbn13: "9780000000001",
      pageCount: 280,
      categories: ["Fiction"],
      language: "en",
      thumbnailUrl: null,
      previewLink: null,
      infoLink: "https://example.com/info",
      canonicalLink: "https://example.com/canonical",
      rawGoogleJson: {},
    });

    const club = await createClub({
      createdById: owner.id,
      name: "Shelf Import Club",
      description: null,
      visibility: "PUBLIC",
    });
    const activeShelf = await createShelf({
      userId: owner.id,
      name: "Main Shelf",
      description: null,
      isPublic: true,
    });
    await createShelf({
      userId: owner.id,
      name: "Empty Shelf",
      description: null,
      isPublic: false,
    });

    await addBookToShelf({
      shelfId: activeShelf.id,
      bookId: fixtureBook!.id,
      addedById: owner.id,
      note: "Already reading with the club.",
    });
    await addBookToShelf({
      shelfId: activeShelf.id,
      bookId: extraBook.id,
      addedById: owner.id,
      note: "Import this one next.",
    });

    await addBookToClub({
      clubId: club.id,
      bookId: fixtureBook!.id,
      addedById: owner.id,
      status: "READING",
    });

    const sources = await listShelfImportSourcesForClub({
      clubId: club.id,
      userId: owner.id,
    });

    expect(sources).toEqual([
      {
        shelfId: expect.any(String),
        shelfName: "Empty Shelf",
        isPublic: false,
        books: [],
      },
      {
        shelfId: activeShelf.id,
        shelfName: "Main Shelf",
        isPublic: true,
        books: [
          {
            bookId: extraBook.id,
            googleVolumeId: "importable-extra-volume",
            title: "Importable Extra Book",
            authors: ["Extra Author"],
            thumbnailUrl: null,
            note: "Import this one next.",
          },
        ],
      },
    ]);
  });

  it("revives a removed club book without duplicating the active record", async () => {
    const owner = await getRequiredUser("owner");
    const book = await findBookByGoogleVolumeId(TEST_BOOK_VOLUME_ID);

    expect(book, "Expected seeded fixture book.").toBeTruthy();

    const club = await createClub({
      createdById: owner.id,
      name: "Revival Club",
      description: null,
      visibility: "PUBLIC",
    });

    const originalClubBook = await addBookToClub({
      clubId: club.id,
      bookId: book!.id,
      addedById: owner.id,
      status: "READ",
    });

    await removeClubBook({
      clubId: club.id,
      clubBookId: originalClubBook.id,
      removedById: owner.id,
    });

    const revivedClubBook = await addBookToClub({
      clubId: club.id,
      bookId: book!.id,
      addedById: owner.id,
      status: "WANT_TO_READ",
    });

    expect(revivedClubBook.id).toBe(originalClubBook.id);
    expect(revivedClubBook.status).toBe("WANT_TO_READ");
    expect(revivedClubBook.removedAt).toBeNull();

    const clubBooks = await listClubBooks(club.id);
    expect(clubBooks).toHaveLength(1);
    expect(clubBooks[0]?.id).toBe(originalClubBook.id);
    expect(clubBooks[0]?.status).toBe("WANT_TO_READ");
  });

  it("lists members in role order and lets non-owners leave", async () => {
    const owner = await getRequiredUser("owner");
    const member = await getRequiredUser("member");
    const stranger = await getRequiredUser("stranger");

    const club = await createClub({
      createdById: owner.id,
      name: "Roster Club",
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
    await changeClubMemberRole({
      clubId: club.id,
      targetUserId: member.id,
      changedById: owner.id,
      nextRole: "ADMIN",
    });

    const members = await listClubMembers(club.id, owner.id);
    expect(
      members.map((clubMember) => ({
        userId: clubMember.userId,
        role: clubMember.role,
      })),
    ).toEqual([
      { userId: owner.id, role: "OWNER" },
      { userId: member.id, role: "ADMIN" },
      { userId: stranger.id, role: "MEMBER" },
    ]);

    const departedMembership = await leaveClub({
      clubId: club.id,
      userId: stranger.id,
    });
    expect(departedMembership.role).toBe("MEMBER");

    const detail = await findClubDetail(club.id, owner.id);
    expect(detail?.memberCount).toBe(2);
  });

  it("lets admins add admins from members but keeps demotion owner-only", async () => {
    const owner = await getRequiredUser("owner");
    const member = await getRequiredUser("member");
    const stranger = await getRequiredUser("stranger");

    const club = await createClub({
      createdById: owner.id,
      name: "Management Club",
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
    await changeClubMemberRole({
      clubId: club.id,
      targetUserId: member.id,
      changedById: owner.id,
      nextRole: "ADMIN",
    });

    const promotedMembership = await changeClubMemberRole({
      clubId: club.id,
      targetUserId: stranger.id,
      changedById: member.id,
      nextRole: "ADMIN",
    });
    expect(promotedMembership.role).toBe("ADMIN");

    await expect(
      changeClubMemberRole({
        clubId: club.id,
        targetUserId: stranger.id,
        changedById: member.id,
        nextRole: "MEMBER",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "You do not have permission to change this member's role.",
    });

    const demotedMembership = await changeClubMemberRole({
      clubId: club.id,
      targetUserId: stranger.id,
      changedById: owner.id,
      nextRole: "MEMBER",
    });
    expect(demotedMembership.role).toBe("MEMBER");

    const removedMembership = await removeClubMember({
      clubId: club.id,
      targetUserId: stranger.id,
      removedById: member.id,
    });
    expect(removedMembership.role).toBe("MEMBER");

    const remainingMembers = await listClubMembers(club.id, owner.id);
    expect(
      remainingMembers.map((clubMember) => ({
        userId: clubMember.userId,
        role: clubMember.role,
      })),
    ).toEqual([
      { userId: owner.id, role: "OWNER" },
      { userId: member.id, role: "ADMIN" },
    ]);
  });

  it("blocks owner leave, supports ownership transfer, and reserves deletion for owners", async () => {
    const owner = await getRequiredUser("owner");
    const member = await getRequiredUser("member");

    const club = await createClub({
      createdById: owner.id,
      name: "Ownership Club",
      description: null,
      visibility: "PUBLIC",
    });

    await joinPublicClub({
      clubId: club.id,
      userId: member.id,
    });
    await changeClubMemberRole({
      clubId: club.id,
      targetUserId: member.id,
      changedById: owner.id,
      nextRole: "ADMIN",
    });

    await expect(
      leaveClub({
        clubId: club.id,
        userId: owner.id,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Transfer ownership or delete the club before leaving.",
    });

    const transferredClub = await transferClubOwnership({
      clubId: club.id,
      nextOwnerUserId: member.id,
      transferredById: owner.id,
    });
    expect(transferredClub.createdById).toBe(member.id);

    const members = await listClubMembers(club.id, member.id);
    expect(
      members.map((clubMember) => ({
        userId: clubMember.userId,
        role: clubMember.role,
      })),
    ).toEqual([
      { userId: member.id, role: "OWNER" },
      { userId: owner.id, role: "ADMIN" },
    ]);

    await expect(
      deleteClub({
        clubId: club.id,
        deletedById: owner.id,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Only the club owner can delete the club.",
    });

    await deleteClub({
      clubId: club.id,
      deletedById: member.id,
    });

    expect(await findClubDetail(club.id, member.id)).toBeNull();
    expect(await listUserClubs(owner.id)).toEqual([]);
    expect(await listUserClubs(member.id)).toEqual([]);
  });

  it("adds multiple club books in one transaction with stable ordering", async () => {
    const owner = await getRequiredUser("owner");
    const fixtureBook = await findBookByGoogleVolumeId(TEST_BOOK_VOLUME_ID);

    expect(fixtureBook, "Expected seeded fixture book.").toBeTruthy();

    const extraBookA = await upsertBook({
      googleVolumeId: "bulk-import-a",
      title: "Bulk Import A",
      subtitle: null,
      description: null,
      authors: ["Author A"],
      publisher: null,
      publishedDate: null,
      pageCount: null,
      categories: [],
      language: null,
      thumbnailUrl: null,
      previewLink: null,
      infoLink: null,
      canonicalLink: null,
      isbn10: null,
      isbn13: null,
      rawGoogleJson: null,
    });
    const extraBookB = await upsertBook({
      googleVolumeId: "bulk-import-b",
      title: "Bulk Import B",
      subtitle: null,
      description: null,
      authors: ["Author B"],
      publisher: null,
      publishedDate: null,
      pageCount: null,
      categories: [],
      language: null,
      thumbnailUrl: null,
      previewLink: null,
      infoLink: null,
      canonicalLink: null,
      isbn10: null,
      isbn13: null,
      rawGoogleJson: null,
    });

    const club = await createClub({
      createdById: owner.id,
      name: "Bulk Import Club",
      description: null,
      visibility: "PUBLIC",
    });

    await addBookToClub({
      clubId: club.id,
      bookId: fixtureBook!.id,
      addedById: owner.id,
      status: "WANT_TO_READ",
    });

    const addedClubBooks = await addBooksToClub({
      clubId: club.id,
      bookIds: [extraBookA.id, extraBookB.id],
      addedById: owner.id,
      status: "WANT_TO_READ",
    });

    expect(addedClubBooks.map((clubBook) => clubBook.sortOrder)).toEqual([1, 2]);

    const clubBooks = await listClubBooks(club.id);
    const wantToReadBooks = clubBooks
      .filter((clubBook) => clubBook.status === "WANT_TO_READ")
      .map((clubBook) => ({
        bookId: clubBook.book.id,
        sortOrder: clubBook.sortOrder,
      }));

    expect(wantToReadBooks).toEqual([
      { bookId: fixtureBook!.id, sortOrder: 0 },
      { bookId: extraBookA.id, sortOrder: 1 },
      { bookId: extraBookB.id, sortOrder: 2 },
    ]);
  });

  it("rolls back bulk club imports when one selected book is invalid", async () => {
    const owner = await getRequiredUser("owner");
    const fixtureBook = await findBookByGoogleVolumeId(TEST_BOOK_VOLUME_ID);

    expect(fixtureBook, "Expected seeded fixture book.").toBeTruthy();

    const club = await createClub({
      createdById: owner.id,
      name: "Bulk Import Rollback Club",
      description: null,
      visibility: "PUBLIC",
    });

    await expect(
      addBooksToClub({
        clubId: club.id,
        bookIds: [fixtureBook!.id, randomUUID()],
        addedById: owner.id,
        status: "WANT_TO_READ",
      }),
    ).rejects.toThrow();

    const clubBooks = await listClubBooks(club.id);
    expect(clubBooks).toHaveLength(0);
  });
});

import { beforeEach, describe, expect, it } from "vitest";

import { findUserByProviderIdentity } from "@/lib/auth/users";
import {
  acceptClubInvitation,
  addBookToClub,
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
  listDiscoverablePublicClubs,
  listUserClubs,
  moveClubBook,
  removeClubMember,
  removeClubBook,
  transferClubOwnership,
} from "@/lib/clubs/repository";
import { resetTestDatabase, TEST_BOOK_VOLUME_ID } from "@/lib/test/fixtures";
import { E2E_USER_PROVIDER } from "@/lib/auth/e2e";
import { findBookByGoogleVolumeId } from "@/lib/books/repository";

async function getRequiredUser(key: string) {
  const user = await findUserByProviderIdentity(E2E_USER_PROVIDER, key);
  expect(user, `Expected seeded user for key ${key}`).toBeTruthy();
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
      invitedEmail: member.email ?? "",
    });

    const lookup = await findInvitationByToken(invitationResult.rawToken);
    expect(lookup?.invitedEmail).toBe(member.email);
    expect(lookup?.effectiveStatus).toBe("PENDING");

    const accepted = await acceptClubInvitation({
      token: invitationResult.rawToken,
      user: member,
    });

    expect(accepted.clubId).toBe(privateClub.id);

    const memberClubDetail = await findClubDetail(privateClub.id, member.id);
    expect(memberClubDetail?.currentUserRole).toBe("MEMBER");

    const updatedLookup = await findInvitationByToken(invitationResult.rawToken);
    expect(updatedLookup?.effectiveStatus).toBe("ACCEPTED");
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
      invitedEmail: member.email ?? "",
    });

    await expect(
      acceptClubInvitation({
        token: invitationResult.rawToken,
        user: stranger,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "This invitation is for a different account.",
    });

    const strangerClubs = await listUserClubs(stranger.id);
    expect(strangerClubs).toHaveLength(0);

    const invitationLookup = await findInvitationByToken(invitationResult.rawToken);
    expect(invitationLookup?.effectiveStatus).toBe("PENDING");
    expect(invitationLookup?.invitedUserId).toBeNull();
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

  it("lets admins remove members but keeps role changes owner-only", async () => {
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

    await expect(
      changeClubMemberRole({
        clubId: club.id,
        targetUserId: stranger.id,
        changedById: member.id,
        nextRole: "ADMIN",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Only the club owner can change member roles.",
    });

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
});

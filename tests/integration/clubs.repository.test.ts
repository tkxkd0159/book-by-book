import { beforeEach, describe, expect, it } from "vitest";

import { findUserByProviderIdentity } from "@/lib/auth/users";
import {
  acceptClubInvitation,
  addBookToClub,
  createClub,
  createClubInvitation,
  findClubDetail,
  findInvitationByToken,
  joinPublicClub,
  listClubBooks,
  moveClubBook,
  removeClubBook,
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
});

import { beforeEach, describe, expect, it } from "vitest";

import { E2E_USER_PROVIDER } from "@/lib/test-harness/auth";
import { findUserByProviderIdentity } from "@/lib/auth/users";
import { findBookByGoogleVolumeId } from "@/lib/books/repository";
import {
  addBookToShelf,
  createShelf,
  deleteShelf,
  findOwnedShelfDetail,
  findPublicShelfDetail,
  listManageableShelfBookTargetsByGoogleVolumeIds,
  listUserShelves,
  removeShelfItem,
  updateShelf,
  updateShelfItemNote,
} from "@/lib/shelves/repository";
import {
  resetTestDatabase,
  TEST_BOOK_VOLUME_ID,
} from "@/lib/test-harness/fixtures";
import type { AuthUser } from "@/types/auth";

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

describe("shelves repository integration", () => {
  it("creates, lists, updates, and deletes owner shelves", async () => {
    const owner = await getRequiredUser("owner");

    const shelf = await createShelf({
      userId: owner.id,
      name: "Weekend Reads",
      description: "Quiet stack",
      isPublic: false,
    });

    expect(shelf.name).toBe("Weekend Reads");

    const listedShelves = await listUserShelves(owner.id);
    expect(listedShelves).toHaveLength(1);
    expect(listedShelves[0]?.itemCount).toBe(0);
    expect(listedShelves[0]?.isPublic).toBe(false);

    const updatedShelf = await updateShelf({
      shelfId: shelf.id,
      userId: owner.id,
      name: "Weekend Re-reads",
      description: "Updated",
      isPublic: true,
    });

    expect(updatedShelf.name).toBe("Weekend Re-reads");
    expect(updatedShelf.isPublic).toBe(true);

    const detail = await findOwnedShelfDetail(shelf.id, owner.id);
    expect(detail?.owner.id).toBe(owner.id);
    expect(detail?.owner.name).toBe(owner.nickname);
    expect(detail?.name).toBe("Weekend Re-reads");

    await deleteShelf({
      shelfId: shelf.id,
      userId: owner.id,
    });

    expect(await listUserShelves(owner.id)).toHaveLength(0);
  });

  it("allows signed-in readers to open public shelves and blocks private ones", async () => {
    const owner = await getRequiredUser("owner");
    const reader = await getRequiredUser("member");
    const book = await findBookByGoogleVolumeId(TEST_BOOK_VOLUME_ID);

    expect(book, "Expected seeded fixture book.").toBeTruthy();

    const publicShelf = await createShelf({
      userId: owner.id,
      name: "Shared Picks",
      description: null,
      isPublic: true,
    });

    await addBookToShelf({
      shelfId: publicShelf.id,
      bookId: book!.id,
      addedById: owner.id,
    });

    const publicDetail = await findPublicShelfDetail({
      shelfId: publicShelf.id,
      ownerUserId: owner.id,
      viewerUserId: reader.id,
    });

    expect(publicDetail.owner.id).toBe(owner.id);
    expect(publicDetail.owner.name).toBe(owner.nickname);
    expect(publicDetail.itemCount).toBe(1);
    expect(publicDetail.items[0]?.book.googleVolumeId).toBe(TEST_BOOK_VOLUME_ID);

    const privateShelf = await createShelf({
      userId: owner.id,
      name: "Private Notes",
      description: null,
      isPublic: false,
    });

    await expect(
      findPublicShelfDetail({
        shelfId: privateShelf.id,
        ownerUserId: owner.id,
        viewerUserId: reader.id,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "This shelf is private.",
    });
  });

  it("manages shelf items idempotently and enforces owner-only writes", async () => {
    const owner = await getRequiredUser("owner");
    const reader = await getRequiredUser("member");
    const book = await findBookByGoogleVolumeId(TEST_BOOK_VOLUME_ID);

    expect(book, "Expected seeded fixture book.").toBeTruthy();

    const shelf = await createShelf({
      userId: owner.id,
      name: "Owned Shelf",
      description: null,
      isPublic: true,
    });

    const addedItem = await addBookToShelf({
      shelfId: shelf.id,
      bookId: book!.id,
      addedById: owner.id,
    });
    const duplicateItem = await addBookToShelf({
      shelfId: shelf.id,
      bookId: book!.id,
      addedById: owner.id,
    });

    expect(duplicateItem.id).toBe(addedItem.id);

    const updatedItem = await updateShelfItemNote({
      shelfId: shelf.id,
      bookId: book!.id,
      userId: owner.id,
      note: "Needs a second read.",
    });

    expect(updatedItem.note).toBe("Needs a second read.");

    const detail = await findOwnedShelfDetail(shelf.id, owner.id);
    expect(detail?.items).toHaveLength(1);
    expect(detail?.items[0]?.note).toBe("Needs a second read.");

    await expect(
      addBookToShelf({
        shelfId: shelf.id,
        bookId: book!.id,
        addedById: reader.id,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Only the shelf owner can modify this shelf.",
    });

    await expect(
      updateShelfItemNote({
        shelfId: shelf.id,
        bookId: book!.id,
        userId: reader.id,
        note: "Not allowed",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Only the shelf owner can modify this shelf.",
    });

    await removeShelfItem({
      shelfId: shelf.id,
      bookId: book!.id,
      userId: owner.id,
    });

    const emptyDetail = await findOwnedShelfDetail(shelf.id, owner.id);
    expect(emptyDetail?.itemCount).toBe(0);

    await expect(
      removeShelfItem({
        shelfId: shelf.id,
        bookId: book!.id,
        userId: owner.id,
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Shelf item not found.",
    });
  });

  it("reports manageable shelf targets for added and missing shelf books", async () => {
    const owner = await getRequiredUser("owner");
    const book = await findBookByGoogleVolumeId(TEST_BOOK_VOLUME_ID);

    expect(book, "Expected seeded fixture book.").toBeTruthy();

    const addedShelf = await createShelf({
      userId: owner.id,
      name: "Added Shelf",
      description: null,
      isPublic: false,
    });
    await createShelf({
      userId: owner.id,
      name: "Empty Shelf",
      description: null,
      isPublic: true,
    });

    await addBookToShelf({
      shelfId: addedShelf.id,
      bookId: book!.id,
      addedById: owner.id,
    });

    const targetsByVolumeId = await listManageableShelfBookTargetsByGoogleVolumeIds(
      owner.id,
      [TEST_BOOK_VOLUME_ID, "missing-google-volume-id"],
    );

    expect(targetsByVolumeId[TEST_BOOK_VOLUME_ID]).toEqual([
      {
        shelfId: expect.any(String),
        shelfName: "Empty Shelf",
        isPublic: true,
        alreadyAdded: false,
      },
      {
        shelfId: addedShelf.id,
        shelfName: "Added Shelf",
        isPublic: false,
        alreadyAdded: true,
      },
    ]);

    expect(targetsByVolumeId["missing-google-volume-id"]).toEqual([
      {
        shelfId: expect.any(String),
        shelfName: "Empty Shelf",
        isPublic: true,
        alreadyAdded: false,
      },
      {
        shelfId: addedShelf.id,
        shelfName: "Added Shelf",
        isPublic: false,
        alreadyAdded: false,
      },
    ]);
  });
});

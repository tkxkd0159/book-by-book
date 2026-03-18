import { beforeEach, describe, expect, it } from "vitest";

import { E2E_USER_PROVIDER } from "@/lib/auth/e2e";
import { findUserByProviderIdentity } from "@/lib/auth/users";
import {
  loadOwnedShelfRouteAccess,
  loadPublicShelfRouteAccess,
} from "@/lib/shelves/access";
import { createShelf } from "@/lib/shelves/repository";
import { resetTestDatabase } from "@/lib/test/fixtures";
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

describe("shelf route access integration", () => {
  it("loads owner shelves only for the owner route", async () => {
    const owner = await getRequiredUser("owner");
    const member = await getRequiredUser("member");
    const shelf = await createShelf({
      userId: owner.id,
      name: "Owned Shelf",
      description: null,
      isPublic: false,
    });

    expect(
      await loadOwnedShelfRouteAccess({
        currentUserId: owner.id,
        shelfId: shelf.id,
      }),
    ).toMatchObject({
      status: "ok",
      shelf: { id: shelf.id },
    });

    expect(
      await loadOwnedShelfRouteAccess({
        currentUserId: member.id,
        shelfId: shelf.id,
      }),
    ).toEqual({ status: "not_found" });
  });

  it("distinguishes public reads, private forbids, and mismatched owner ids", async () => {
    const owner = await getRequiredUser("owner");
    const member = await getRequiredUser("member");
    const stranger = await getRequiredUser("stranger");

    const publicShelf = await createShelf({
      userId: owner.id,
      name: "Shared Shelf",
      description: null,
      isPublic: true,
    });
    const privateShelf = await createShelf({
      userId: owner.id,
      name: "Private Shelf",
      description: null,
      isPublic: false,
    });

    expect(
      await loadPublicShelfRouteAccess({
        viewerUserId: member.id,
        ownerUserId: owner.id,
        shelfId: publicShelf.id,
      }),
    ).toMatchObject({
      status: "ok",
      shelf: { id: publicShelf.id },
    });

    expect(
      await loadPublicShelfRouteAccess({
        viewerUserId: member.id,
        ownerUserId: owner.id,
        shelfId: privateShelf.id,
      }),
    ).toEqual({ status: "forbidden" });

    expect(
      await loadPublicShelfRouteAccess({
        viewerUserId: stranger.id,
        ownerUserId: member.id,
        shelfId: publicShelf.id,
      }),
    ).toEqual({ status: "not_found" });
  });
});

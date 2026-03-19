import { SHELF_ERROR_MESSAGES, ShelfError } from "@/lib/shelves/errors";
import {
  findOwnedShelfDetail,
  findPublicShelfDetail,
  type ShelfDetail,
} from "@/lib/shelves/repository";

export type OwnedShelfRouteAccess =
  | { status: "not_found" }
  | { status: "ok"; shelf: ShelfDetail };

export type PublicShelfRouteAccess =
  | { status: "not_found" }
  | { status: "forbidden" }
  | { status: "ok"; shelf: ShelfDetail };

export async function loadOwnedShelfRouteAccess(input: {
  currentUserId: string;
  shelfId: string;
}): Promise<OwnedShelfRouteAccess> {
  const shelf = await findOwnedShelfDetail(input.shelfId, input.currentUserId);

  if (!shelf) {
    return { status: "not_found" };
  }

  return { status: "ok", shelf };
}

export async function loadPublicShelfRouteAccess(input: {
  viewerUserId: string;
  ownerUserId: string;
  shelfId: string;
}): Promise<PublicShelfRouteAccess> {
  try {
    const shelf = await findPublicShelfDetail({
      shelfId: input.shelfId,
      ownerUserId: input.ownerUserId,
      viewerUserId: input.viewerUserId,
    });

    return { status: "ok", shelf };
  } catch (error) {
    if (!(error instanceof ShelfError)) {
      throw error;
    }

    if (
      error.code === "FORBIDDEN" &&
      error.message === SHELF_ERROR_MESSAGES.privateShelf
    ) {
      return { status: "forbidden" };
    }

    if (
      error.code === "NOT_FOUND" &&
      error.message === SHELF_ERROR_MESSAGES.shelfNotFound
    ) {
      return { status: "not_found" };
    }

    throw error;
  }
}

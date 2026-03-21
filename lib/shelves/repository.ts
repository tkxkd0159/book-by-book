import sql from "@/lib/db";
import type { AuthUser, BookRecord, ShelfItemRecord, ShelfRecord } from "@/types/db";

import { SHELF_ERROR_MESSAGES, ShelfError } from "@/lib/shelves/errors";
import { canManageShelf, canViewShelf } from "@/lib/shelves/permissions";

type QueryExecutor = typeof sql;

type ShelfRow = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type ShelfSummaryRow = ShelfRow & {
  itemCount: number;
};

type ShelfAccessRow = {
  id: string;
  userId: string;
  isPublic: boolean;
};

type ShelfDetailRow = ShelfRow & {
  ownerName: string | null;
  ownerImageUrl: string | null;
};

type ShelfItemRow = {
  id: string;
  shelfId: string;
  bookId: string;
  note: string | null;
  sortOrder: number;
  addedAt: Date;
};

type ShelfItemWithBookRow = ShelfItemRow & {
  googleVolumeId: string;
  title: string;
  subtitle: string | null;
  authors: string[] | null;
  publisher: string | null;
  publishedDate: string | null;
  thumbnailUrl: string | null;
  infoLink: string | null;
};

type ManageableShelfBookTargetRow = {
  googleVolumeId: string;
  shelfId: string;
};

export type ShelfSummary = ShelfRecord & {
  itemCount: number;
};

export type ShelfOwnerSummary = Pick<AuthUser, "id" | "name" | "imageUrl">;

export type ShelfItemWithBook = ShelfItemRecord & {
  book: Pick<
    BookRecord,
    | "id"
    | "googleVolumeId"
    | "title"
    | "subtitle"
    | "authors"
    | "publisher"
    | "publishedDate"
    | "thumbnailUrl"
    | "infoLink"
  >;
};

export type ShelfDetail = ShelfRecord & {
  itemCount: number;
  owner: ShelfOwnerSummary;
  items: ShelfItemWithBook[];
};

export type ManageableShelfBookTarget = {
  shelfId: string;
  shelfName: string;
  isPublic: boolean;
  alreadyAdded: boolean;
};

function asQueryExecutor(tx: unknown) {
  return tx as QueryExecutor;
}

function mapShelf(row: ShelfRow): ShelfRecord {
  return row;
}

function mapShelfSummary(row: ShelfSummaryRow): ShelfSummary {
  return {
    ...mapShelf(row),
    itemCount: Number(row.itemCount ?? 0),
  };
}

function mapShelfItem(row: ShelfItemRow): ShelfItemRecord {
  return {
    ...row,
    sortOrder: Number(row.sortOrder ?? 0),
  };
}

function mapShelfItemWithBook(row: ShelfItemWithBookRow): ShelfItemWithBook {
  return {
    ...mapShelfItem(row),
    book: {
      id: row.bookId,
      googleVolumeId: row.googleVolumeId,
      title: row.title,
      subtitle: row.subtitle,
      authors: row.authors ?? [],
      publisher: row.publisher,
      publishedDate: row.publishedDate,
      thumbnailUrl: row.thumbnailUrl,
      infoLink: row.infoLink,
    },
  };
}

async function findShelfAccess(
  query: QueryExecutor,
  shelfId: string,
): Promise<ShelfAccessRow | null> {
  const [shelf] = await query<ShelfAccessRow[]>`
    select
      id::text as id,
      user_id::text as "userId",
      is_public as "isPublic"
    from bookapp.shelves
    where id = ${shelfId}::uuid
    limit 1
  `;

  return shelf ?? null;
}

async function requireOwnedShelf(
  query: QueryExecutor,
  shelfId: string,
  currentUserId: string,
) {
  const shelf = await findShelfAccess(query, shelfId);
  if (!shelf) {
    throw new ShelfError("NOT_FOUND", SHELF_ERROR_MESSAGES.shelfNotFound);
  }

  if (!canManageShelf(shelf.userId, currentUserId)) {
    throw new ShelfError("FORBIDDEN", SHELF_ERROR_MESSAGES.shelfOwnerOnly);
  }

  return shelf;
}

async function findShelfDetailRow(
  query: QueryExecutor,
  shelfId: string,
  ownerUserId?: string,
): Promise<ShelfDetailRow | null> {
  if (ownerUserId) {
    const [row] = await query<ShelfDetailRow[]>`
      select
        shelves.id::text as id,
        shelves.user_id::text as "userId",
        shelves.name,
        shelves.description,
        shelves.is_public as "isPublic",
        shelves.created_at as "createdAt",
        shelves.updated_at as "updatedAt",
        coalesce(users.nickname, users.name) as "ownerName",
        users.image_url as "ownerImageUrl"
      from bookapp.shelves
      inner join bookapp.users on users.id = shelves.user_id
      where shelves.id = ${shelfId}::uuid
        and shelves.user_id = ${ownerUserId}::uuid
      limit 1
    `;

    return row ?? null;
  }

  const [row] = await query<ShelfDetailRow[]>`
    select
      shelves.id::text as id,
      shelves.user_id::text as "userId",
      shelves.name,
      shelves.description,
      shelves.is_public as "isPublic",
      shelves.created_at as "createdAt",
      shelves.updated_at as "updatedAt",
      coalesce(users.nickname, users.name) as "ownerName",
      users.image_url as "ownerImageUrl"
    from bookapp.shelves
    inner join bookapp.users on users.id = shelves.user_id
    where shelves.id = ${shelfId}::uuid
    limit 1
  `;

  return row ?? null;
}

async function listShelfItems(
  query: QueryExecutor,
  shelfId: string,
): Promise<ShelfItemWithBook[]> {
  const rows = await query<ShelfItemWithBookRow[]>`
    select
      shelf_items.id::text as id,
      shelf_items.shelf_id::text as "shelfId",
      shelf_items.book_id::text as "bookId",
      shelf_items.note,
      shelf_items.sort_order as "sortOrder",
      shelf_items.added_at as "addedAt",
      books.google_volume_id as "googleVolumeId",
      books.title,
      books.subtitle,
      books.authors,
      books.publisher,
      books.published_date as "publishedDate",
      books.thumbnail_url as "thumbnailUrl",
      books.info_link as "infoLink"
    from bookapp.shelf_items
    inner join bookapp.books on books.id = shelf_items.book_id
    where shelf_items.shelf_id = ${shelfId}::uuid
    order by shelf_items.sort_order asc, shelf_items.added_at asc
  `;

  return rows.map(mapShelfItemWithBook);
}

async function buildShelfDetail(
  query: QueryExecutor,
  row: ShelfDetailRow,
): Promise<ShelfDetail> {
  const items = await listShelfItems(query, row.id);

  return {
    ...mapShelf(row),
    itemCount: items.length,
    owner: {
      id: row.userId,
      name: row.ownerName,
      imageUrl: row.ownerImageUrl,
    },
    items,
  };
}

export async function listUserShelves(userId: string): Promise<ShelfSummary[]> {
  const rows = await sql<ShelfSummaryRow[]>`
    select
      shelves.id::text as id,
      shelves.user_id::text as "userId",
      shelves.name,
      shelves.description,
      shelves.is_public as "isPublic",
      shelves.created_at as "createdAt",
      shelves.updated_at as "updatedAt",
      count(shelf_items.id)::int as "itemCount"
    from bookapp.shelves
    left join bookapp.shelf_items on shelf_items.shelf_id = shelves.id
    where shelves.user_id = ${userId}::uuid
    group by shelves.id
    order by shelves.created_at desc
  `;

  return rows.map(mapShelfSummary);
}

export async function listManageableShelfBookTargetsByGoogleVolumeIds(
  userId: string,
  googleVolumeIds: string[],
) {
  const normalizedVolumeIds = Array.from(
    new Set(
      googleVolumeIds
        .map((googleVolumeId) => googleVolumeId.trim())
        .filter((googleVolumeId) => googleVolumeId.length > 0),
    ),
  );

  if (normalizedVolumeIds.length === 0) {
    return {} satisfies Record<string, ManageableShelfBookTarget[]>;
  }

  const shelves = await listUserShelves(userId);
  if (shelves.length === 0) {
    return Object.fromEntries(
      normalizedVolumeIds.map((googleVolumeId) => [googleVolumeId, []]),
    ) satisfies Record<string, ManageableShelfBookTarget[]>;
  }

  const shelfIds = shelves.map((shelf) => shelf.id);
  const rows = await sql<ManageableShelfBookTargetRow[]>`
    select
      books.google_volume_id as "googleVolumeId",
      shelf_items.shelf_id::text as "shelfId"
    from bookapp.shelf_items
    inner join bookapp.books on books.id = shelf_items.book_id
    where books.google_volume_id in ${sql(normalizedVolumeIds)}
      and shelf_items.shelf_id in ${sql(shelfIds)}
  `;

  const activeTargets = new Set(
    rows.map((row) => `${row.googleVolumeId}:${row.shelfId}`),
  );

  return Object.fromEntries(
    normalizedVolumeIds.map((googleVolumeId) => [
      googleVolumeId,
      shelves.map((shelf) => ({
        shelfId: shelf.id,
        shelfName: shelf.name,
        isPublic: shelf.isPublic,
        alreadyAdded: activeTargets.has(`${googleVolumeId}:${shelf.id}`),
      })),
    ]),
  ) satisfies Record<string, ManageableShelfBookTarget[]>;
}

export async function listManageableShelfBookTargetsForGoogleVolumeId(
  userId: string,
  googleVolumeId: string,
) {
  const targetsByVolumeId = await listManageableShelfBookTargetsByGoogleVolumeIds(
    userId,
    [googleVolumeId],
  );

  return targetsByVolumeId[googleVolumeId.trim()] ?? [];
}

export async function findOwnedShelfDetail(
  shelfId: string,
  ownerUserId: string,
): Promise<ShelfDetail | null> {
  const row = await findShelfDetailRow(sql, shelfId, ownerUserId);
  if (!row) {
    return null;
  }

  return buildShelfDetail(sql, row);
}

export async function findPublicShelfDetail(input: {
  shelfId: string;
  ownerUserId: string;
  viewerUserId: string;
}): Promise<ShelfDetail> {
  const row = await findShelfDetailRow(sql, input.shelfId, input.ownerUserId);
  if (!row) {
    throw new ShelfError("NOT_FOUND", SHELF_ERROR_MESSAGES.shelfNotFound);
  }

  if (
    !canViewShelf({
      ownerUserId: row.userId,
      currentUserId: input.viewerUserId,
      isPublic: row.isPublic,
    })
  ) {
    throw new ShelfError("FORBIDDEN", SHELF_ERROR_MESSAGES.privateShelf);
  }

  return buildShelfDetail(sql, row);
}

export async function createShelf(input: {
  userId: string;
  name: string;
  description: string | null;
  isPublic: boolean;
}): Promise<ShelfRecord> {
  const [shelf] = await sql<ShelfRow[]>`
    insert into bookapp.shelves (
      user_id,
      name,
      description,
      is_public
    )
    values (
      ${input.userId}::uuid,
      ${input.name},
      ${input.description},
      ${input.isPublic}
    )
    returning
      id::text as id,
      user_id::text as "userId",
      name,
      description,
      is_public as "isPublic",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `;

  return mapShelf(shelf);
}

export async function updateShelf(input: {
  shelfId: string;
  userId: string;
  name: string;
  description: string | null;
  isPublic: boolean;
}): Promise<ShelfRecord> {
  await requireOwnedShelf(sql, input.shelfId, input.userId);

  const [shelf] = await sql<ShelfRow[]>`
    update bookapp.shelves
    set
      name = ${input.name},
      description = ${input.description},
      is_public = ${input.isPublic}
    where id = ${input.shelfId}::uuid
    returning
      id::text as id,
      user_id::text as "userId",
      name,
      description,
      is_public as "isPublic",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `;

  return mapShelf(shelf);
}

export async function deleteShelf(input: {
  shelfId: string;
  userId: string;
}): Promise<void> {
  await requireOwnedShelf(sql, input.shelfId, input.userId);

  await sql`
    delete from bookapp.shelves
    where id = ${input.shelfId}::uuid
  `;
}

export async function addBookToShelf(input: {
  shelfId: string;
  bookId: string;
  addedById: string;
  note?: string | null;
  sortOrder?: number | null;
}): Promise<ShelfItemRecord> {
  return sql.begin(async (tx) => {
    const query = asQueryExecutor(tx);
    await requireOwnedShelf(query, input.shelfId, input.addedById);

    const [existing] = await query<ShelfItemRow[]>`
      select
        id::text as id,
        shelf_id::text as "shelfId",
        book_id::text as "bookId",
        note,
        sort_order as "sortOrder",
        added_at as "addedAt"
      from bookapp.shelf_items
      where shelf_id = ${input.shelfId}::uuid
        and book_id = ${input.bookId}::uuid
      limit 1
    `;

    if (existing) {
      return mapShelfItem(existing);
    }

    const [{ nextSortOrder }] = await query<{ nextSortOrder: number }[]>`
      select coalesce(max(sort_order), -1) + 1 as "nextSortOrder"
      from bookapp.shelf_items
      where shelf_id = ${input.shelfId}::uuid
    `;

    const [item] = await query<ShelfItemRow[]>`
      insert into bookapp.shelf_items (
        shelf_id,
        book_id,
        note,
        sort_order
      )
      values (
        ${input.shelfId}::uuid,
        ${input.bookId}::uuid,
        ${input.note ?? null},
        ${input.sortOrder ?? nextSortOrder}
      )
      returning
        id::text as id,
        shelf_id::text as "shelfId",
        book_id::text as "bookId",
        note,
        sort_order as "sortOrder",
        added_at as "addedAt"
    `;

    return mapShelfItem(item);
  });
}

export async function updateShelfItemNote(input: {
  shelfId: string;
  bookId: string;
  userId: string;
  note: string | null;
}): Promise<ShelfItemRecord> {
  await requireOwnedShelf(sql, input.shelfId, input.userId);

  const [item] = await sql<ShelfItemRow[]>`
    update bookapp.shelf_items
    set note = ${input.note}
    where shelf_id = ${input.shelfId}::uuid
      and book_id = ${input.bookId}::uuid
    returning
      id::text as id,
      shelf_id::text as "shelfId",
      book_id::text as "bookId",
      note,
      sort_order as "sortOrder",
      added_at as "addedAt"
  `;

  if (!item) {
    throw new ShelfError("NOT_FOUND", SHELF_ERROR_MESSAGES.shelfItemNotFound);
  }

  return mapShelfItem(item);
}

export async function removeShelfItem(input: {
  shelfId: string;
  bookId: string;
  userId: string;
}): Promise<void> {
  await requireOwnedShelf(sql, input.shelfId, input.userId);

  const [item] = await sql<ShelfItemRow[]>`
    delete from bookapp.shelf_items
    where shelf_id = ${input.shelfId}::uuid
      and book_id = ${input.bookId}::uuid
    returning
      id::text as id,
      shelf_id::text as "shelfId",
      book_id::text as "bookId",
      note,
      sort_order as "sortOrder",
      added_at as "addedAt"
  `;

  if (!item) {
    throw new ShelfError("NOT_FOUND", SHELF_ERROR_MESSAGES.shelfItemNotFound);
  }
}

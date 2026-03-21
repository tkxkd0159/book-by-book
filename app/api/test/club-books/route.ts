import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { findUserByProviderIdentity } from "@/lib/auth/users";
import { findBookByGoogleVolumeId } from "@/lib/books/repository";
import { addBookToClub, removeClubBook } from "@/lib/clubs/repository";
import {
  E2E_USER_PROVIDER,
  isE2EBypassEnabled,
} from "@/lib/test-harness/auth";
import {
  TEST_ROUTE_ERROR_MESSAGES,
  TEST_USER_KEYS,
} from "@/lib/test-harness/constants";
import {
  TEST_BOOK_VOLUME_ID,
  seedTestUsers,
} from "@/lib/test-harness/fixtures";

export const runtime = "nodejs";

const CLUB_BOOK_STATUSES = ["WANT_TO_READ", "READING", "READ"] as const;

const seedClubBookSchema = z.object({
  kind: z.literal("add-book"),
  clubId: z.string().min(1),
  googleVolumeId: z.string().min(1).default(TEST_BOOK_VOLUME_ID),
  status: z.enum(CLUB_BOOK_STATUSES).default("WANT_TO_READ"),
  user: z.enum(TEST_USER_KEYS),
});

const archiveClubBookSchema = z.object({
  kind: z.literal("remove-book"),
  clubId: z.string().min(1),
  clubBookId: z.string().min(1),
  user: z.enum(TEST_USER_KEYS),
});

const clubBookPayloadSchema = z.union([
  seedClubBookSchema,
  archiveClubBookSchema,
]);

export async function POST(request: NextRequest) {
  if (!isE2EBypassEnabled()) {
    return NextResponse.json(
      { error: TEST_ROUTE_ERROR_MESSAGES.notAvailable },
      { status: 404 },
    );
  }

  const parsedBody = clubBookPayloadSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: TEST_ROUTE_ERROR_MESSAGES.invalidSeedPayload },
      { status: 400 },
    );
  }

  await seedTestUsers();
  const user = await findUserByProviderIdentity(
    E2E_USER_PROVIDER,
    parsedBody.data.user,
  );
  if (!user) {
    return NextResponse.json(
      { error: TEST_ROUTE_ERROR_MESSAGES.unknownTestUser },
      { status: 400 },
    );
  }

  if (parsedBody.data.kind === "remove-book") {
    await removeClubBook({
      clubId: parsedBody.data.clubId,
      clubBookId: parsedBody.data.clubBookId,
      removedById: user.id,
    });

    return NextResponse.json({ ok: true });
  }

  const book = await findBookByGoogleVolumeId(parsedBody.data.googleVolumeId);
  if (!book) {
    return NextResponse.json(
      { error: TEST_ROUTE_ERROR_MESSAGES.invalidSeedPayload },
      { status: 400 },
    );
  }

  const clubBook = await addBookToClub({
    clubId: parsedBody.data.clubId,
    bookId: book.id,
    addedById: user.id,
    status: parsedBody.data.status,
  });

  return NextResponse.json({ ok: true, clubBookId: clubBook.id });
}

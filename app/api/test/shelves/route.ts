import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { findUserByProviderIdentity } from "@/lib/auth/users";
import { findBookByGoogleVolumeId } from "@/lib/books/repository";
import { addBookToShelf } from "@/lib/shelves/repository";
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

const seedShelfBookSchema = z.object({
  kind: z.literal("add-book"),
  shelfId: z.string().min(1),
  user: z.enum(TEST_USER_KEYS),
  googleVolumeId: z.string().min(1).default(TEST_BOOK_VOLUME_ID),
});

export async function POST(request: NextRequest) {
  if (!isE2EBypassEnabled()) {
    return NextResponse.json(
      { error: TEST_ROUTE_ERROR_MESSAGES.notAvailable },
      { status: 404 },
    );
  }

  const parsedBody = seedShelfBookSchema.safeParse(
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

  const book = await findBookByGoogleVolumeId(parsedBody.data.googleVolumeId);
  if (!book) {
    return NextResponse.json(
      { error: TEST_ROUTE_ERROR_MESSAGES.invalidSeedPayload },
      { status: 400 },
    );
  }

  await addBookToShelf({
    shelfId: parsedBody.data.shelfId,
    bookId: book.id,
    addedById: user.id,
  });

  return NextResponse.json({ ok: true });
}

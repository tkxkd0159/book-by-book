import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { E2E_USER_PROVIDER, isE2EBypassEnabled } from "@/lib/auth/e2e";
import { findUserByProviderIdentity } from "@/lib/auth/users";
import {
  TEST_ROUTE_ERROR_MESSAGES,
  TEST_USER_KEYS,
} from "@/tests/support/constants";
import { createThread, createThreadPost } from "@/lib/threads/repository";
import { seedTestUsers } from "@/tests/support/fixtures";

export const runtime = "nodejs";

const seedThreadsSchema = z.object({
  kind: z.literal("threads"),
  clubId: z.string().min(1),
  clubBookId: z.string().min(1),
  count: z.number().int().min(1).max(100),
  prefix: z.string().min(1),
  user: z.enum(TEST_USER_KEYS),
});

const seedPostsSchema = z.object({
  kind: z.literal("posts"),
  clubId: z.string().min(1),
  threadId: z.string().min(1),
  count: z.number().int().min(1).max(100),
  prefix: z.string().min(1),
  user: z.enum(TEST_USER_KEYS),
});

const seedPayloadSchema = z.union([seedThreadsSchema, seedPostsSchema]);

function formatLabel(index: number) {
  return String(index).padStart(2, "0");
}

export async function POST(request: NextRequest) {
  if (!isE2EBypassEnabled()) {
    return NextResponse.json(
      { error: TEST_ROUTE_ERROR_MESSAGES.notAvailable },
      { status: 404 },
    );
  }

  const parsedBody = seedPayloadSchema.safeParse(await request.json().catch(() => null));
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

  if (parsedBody.data.kind === "threads") {
    for (let index = 1; index <= parsedBody.data.count; index += 1) {
      const label = formatLabel(index);
      await createThread({
        clubId: parsedBody.data.clubId,
        clubBookId: parsedBody.data.clubBookId,
        authorId: user.id,
        title: `${parsedBody.data.prefix} ${label}`,
        body: `Body for ${parsedBody.data.prefix.toLowerCase()} ${label}.`,
      });
    }

    return NextResponse.json({ ok: true });
  }

  for (let index = 1; index <= parsedBody.data.count; index += 1) {
    const label = formatLabel(index);
    await createThreadPost({
      clubId: parsedBody.data.clubId,
      threadId: parsedBody.data.threadId,
      authorId: user.id,
      body: `${parsedBody.data.prefix} ${label}`,
    });
  }

  return NextResponse.json({ ok: true });
}

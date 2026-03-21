import { expect, type APIRequestContext } from "@playwright/test";

import { E2E_TEST_ROUTE_PATHS, type E2ETestUser } from "./constants";

type SeedClubBookInput = {
  clubId: string;
  user?: E2ETestUser;
  googleVolumeId?: string;
  status?: "WANT_TO_READ" | "READING" | "READ";
};

type ArchiveClubBookInput = {
  clubId: string;
  clubBookId: string;
  user?: E2ETestUser;
};

type SeedShelfBookInput = {
  shelfId: string;
  user?: E2ETestUser;
  googleVolumeId?: string;
};

type SeedReviewInput = {
  user: E2ETestUser;
  rating: number;
  title?: string;
  body?: string;
  googleVolumeId?: string;
};

type SeedThreadInput = {
  clubId: string;
  clubBookId: string;
  user?: E2ETestUser;
  title: string;
  body?: string;
};

type SeedInvitationCodeInput = {
  label: string;
  expiresAt?: string | null;
  isActive?: boolean;
  maxUses?: number | null;
  redeemByUsers?: E2ETestUser[];
};

export async function seedClubBook(
  request: APIRequestContext,
  input: SeedClubBookInput,
) {
  const response = await request.post(E2E_TEST_ROUTE_PATHS.clubBooks, {
    data: {
      kind: "add-book",
      clubId: input.clubId,
      user: input.user ?? "owner",
      ...(input.googleVolumeId ? { googleVolumeId: input.googleVolumeId } : {}),
      ...(input.status ? { status: input.status } : {}),
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { clubBookId: string };
  expect(body.clubBookId).toBeTruthy();

  return body;
}

export async function archiveClubBook(
  request: APIRequestContext,
  input: ArchiveClubBookInput,
) {
  const response = await request.post(E2E_TEST_ROUTE_PATHS.clubBooks, {
    data: {
      kind: "remove-book",
      clubId: input.clubId,
      clubBookId: input.clubBookId,
      user: input.user ?? "owner",
    },
  });

  expect(response.ok()).toBeTruthy();
}

export async function seedShelfBook(
  request: APIRequestContext,
  input: SeedShelfBookInput,
) {
  const response = await request.post(E2E_TEST_ROUTE_PATHS.shelves, {
    data: {
      kind: "add-book",
      shelfId: input.shelfId,
      user: input.user ?? "owner",
      ...(input.googleVolumeId ? { googleVolumeId: input.googleVolumeId } : {}),
    },
  });

  expect(response.ok()).toBeTruthy();
}

export async function seedReview(
  request: APIRequestContext,
  input: SeedReviewInput,
) {
  const response = await request.post(E2E_TEST_ROUTE_PATHS.reviews, {
    data: {
      kind: "upsert",
      user: input.user,
      rating: input.rating,
      title: input.title ?? "",
      body: input.body ?? "",
      ...(input.googleVolumeId ? { googleVolumeId: input.googleVolumeId } : {}),
    },
  });

  expect(response.ok()).toBeTruthy();
}

export async function seedThread(
  request: APIRequestContext,
  input: SeedThreadInput,
) {
  const response = await request.post(E2E_TEST_ROUTE_PATHS.threads, {
    data: {
      kind: "thread",
      clubId: input.clubId,
      clubBookId: input.clubBookId,
      user: input.user ?? "owner",
      title: input.title,
      body: input.body ?? "",
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { threadId: string };
  expect(body.threadId).toBeTruthy();

  return body;
}

export async function seedInvitationCode(
  request: APIRequestContext,
  input: SeedInvitationCodeInput,
) {
  const response = await request.post(E2E_TEST_ROUTE_PATHS.invitationCodes, {
    data: {
      kind: "create",
      label: input.label,
      ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.maxUses !== undefined ? { maxUses: input.maxUses } : {}),
      ...(input.redeemByUsers ? { redeemByUsers: input.redeemByUsers } : {}),
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as {
    codeId: string;
    rawCode: string;
  };
  expect(body.codeId).toBeTruthy();
  expect(body.rawCode).toBeTruthy();

  return body;
}

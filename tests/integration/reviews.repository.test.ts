import { beforeEach, describe, expect, it } from "vitest";

import { E2E_USER_PROVIDER } from "@/lib/auth/e2e";
import { findUserByProviderIdentity } from "@/lib/auth/users";
import { findBookByGoogleVolumeId } from "@/lib/books/repository";
import {
  deleteReview,
  findReviewByUserAndBook,
  getBookReviewAggregate,
  listRecentBookReviews,
  listUserReviewedBooks,
  upsertReview,
} from "@/lib/reviews/repository";
import { resetTestDatabase, TEST_BOOK_VOLUME_ID } from "@/lib/test/fixtures";
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

describe("reviews repository integration", () => {
  it("upserts reviews and exposes reviewed books plus recent public reviews", async () => {
    const owner = await getRequiredUser("owner");
    const member = await getRequiredUser("member");
    const book = await findBookByGoogleVolumeId(TEST_BOOK_VOLUME_ID);

    expect(book, "Expected seeded fixture book.").toBeTruthy();

    const ownerReview = await upsertReview({
      userId: owner.id,
      bookId: book!.id,
      rating: 4,
      body: "Strong start.",
    });
    const memberReview = await upsertReview({
      userId: member.id,
      bookId: book!.id,
      rating: 5,
      body: "Loved it.",
    });

    expect(ownerReview.rating).toBe(4);
    expect(memberReview.rating).toBe(5);

    const storedOwnerReview = await findReviewByUserAndBook({
      userId: owner.id,
      bookId: book!.id,
    });
    expect(storedOwnerReview?.body).toBe("Strong start.");

    const reviewedBooks = await listUserReviewedBooks(member.id);
    expect(reviewedBooks).toHaveLength(1);
    expect(reviewedBooks[0]?.book.googleVolumeId).toBe(TEST_BOOK_VOLUME_ID);
    expect(reviewedBooks[0]?.review.rating).toBe(5);

    const recentReviews = await listRecentBookReviews({
      bookId: book!.id,
      limit: 10,
    });
    expect(recentReviews).toHaveLength(2);
    expect(recentReviews.map((entry) => entry.author.id)).toEqual(
      expect.arrayContaining([owner.id, member.id]),
    );
  });

  it("excludes deleted reviews from aggregates and reviewed lists", async () => {
    const owner = await getRequiredUser("owner");
    const member = await getRequiredUser("member");
    const book = await findBookByGoogleVolumeId(TEST_BOOK_VOLUME_ID);

    expect(book, "Expected seeded fixture book.").toBeTruthy();

    await upsertReview({
      userId: owner.id,
      bookId: book!.id,
      rating: 4,
      body: "Good.",
    });
    await upsertReview({
      userId: member.id,
      bookId: book!.id,
      rating: 2,
      body: "Not for me.",
    });

    const beforeDelete = await getBookReviewAggregate(book!.id);
    expect(beforeDelete.reviewCount).toBe(2);
    expect(beforeDelete.averageRating).toBe(3);

    await deleteReview({
      userId: owner.id,
      bookId: book!.id,
    });

    const afterDelete = await getBookReviewAggregate(book!.id);
    expect(afterDelete.reviewCount).toBe(1);
    expect(afterDelete.averageRating).toBe(2);

    expect(await listUserReviewedBooks(owner.id)).toHaveLength(0);
    expect(await listRecentBookReviews({ bookId: book!.id, limit: 10 })).toHaveLength(
      1,
    );
  });

  it("revives a deleted review on upsert and rejects deleting missing active reviews", async () => {
    const owner = await getRequiredUser("owner");
    const book = await findBookByGoogleVolumeId(TEST_BOOK_VOLUME_ID);

    expect(book, "Expected seeded fixture book.").toBeTruthy();

    await expect(
      deleteReview({
        userId: owner.id,
        bookId: book!.id,
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Review not found.",
    });

    await upsertReview({
      userId: owner.id,
      bookId: book!.id,
      rating: 3,
      body: "First draft.",
    });
    await deleteReview({
      userId: owner.id,
      bookId: book!.id,
    });

    const revivedReview = await upsertReview({
      userId: owner.id,
      bookId: book!.id,
      rating: 5,
      body: "Changed my mind.",
    });

    expect(revivedReview.deletedAt).toBeNull();
    expect(revivedReview.rating).toBe(5);

    const aggregate = await getBookReviewAggregate(book!.id);
    expect(aggregate.reviewCount).toBe(1);
    expect(aggregate.averageRating).toBe(5);
  });
});

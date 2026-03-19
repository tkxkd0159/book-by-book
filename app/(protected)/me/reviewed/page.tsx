import Link from "next/link";

import { ReviewedBookCard } from "@/components/reviews/reviewed-book-card";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FlashToast } from "@/components/ui/flash-toast";
import { requireCurrentUser } from "@/lib/auth/server";
import { listUserReviewedBooks } from "@/lib/reviews/repository";

function readMessage(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function MyReviewedPage({ searchParams }: Props.Page) {
  const [currentUser, params] = await Promise.all([
    requireCurrentUser(),
    searchParams,
  ]);
  const reviewedBooks = await listUserReviewedBooks(currentUser.id);
  const message = readMessage(params.message);
  const error = readMessage(params.error);
  const focusReview = readMessage(params.focusReview);

  return (
    <div className="max-w-4xl space-y-6">
      <FlashToast
        key={`${message ?? ""}:${error ?? ""}`}
        message={message}
        error={error}
      />

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold sm:text-4xl">Reviewed books</h1>
        <p className="text-(--muted)">
          Track every book you have rated or written about.
        </p>
      </div>

      {reviewedBooks.length === 0 ? (
        <Card className="border-2">
          <CardContent className="space-y-4 p-6 sm:p-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">No reviews yet</h2>
              <p className="text-sm leading-6 text-(--muted)">
                Rate a book or leave a short review to start building your
                reviewed shelf.
              </p>
            </div>
            <Link href="/books/search" className={buttonStyles({})}>
              Find books to review
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviewedBooks.map((entry) => (
            <ReviewedBookCard
              key={[
                entry.review.id,
                entry.review.updatedAt.toISOString(),
                error && focusReview === entry.book.googleVolumeId
                  ? "error"
                  : "clean",
              ].join(":")}
              entry={entry}
              initialMode={
                error && focusReview === entry.book.googleVolumeId
                  ? "edit"
                  : "view"
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

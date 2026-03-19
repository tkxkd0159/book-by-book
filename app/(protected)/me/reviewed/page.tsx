import Link from "next/link";

import { ReviewedBookCard } from "@/components/reviews/reviewed-book-card";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold sm:text-4xl">Reviewed books</h1>
        <p className="text-(--muted)">
          Track every book you have rated or written about.
        </p>
      </div>

      {message ? (
        <p className="rounded-xl border border-[#b9d6cf] bg-[#eef9f5] px-4 py-3 text-sm text-[#125547]">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-[#d39e95] bg-[#fff2ef] px-4 py-3 text-sm text-[#7e1f14]">
          {error}
        </p>
      ) : null}

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
        <div className="space-y-4">
          {reviewedBooks.map((entry) => (
            <ReviewedBookCard key={entry.review.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

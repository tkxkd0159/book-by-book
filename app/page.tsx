import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAuthSession } from "@/lib/auth/server";

export default async function Page() {
  const session = await getAuthSession();
  if (session) {
    redirect("/books/search");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-start justify-center px-4 py-14 sm:px-6 lg:px-8">
      <p className="mb-4 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--muted)]">
        Book by Book
      </p>
      <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
        Build your reading life with social clubs and personal shelves.
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-[var(--muted)]">
        Sign in, discover books from our vast catalog, and start shaping your
        next reads.
      </p>

      <div className="mt-8">
        <Link href="/sign-in" className={buttonStyles({ size: "lg" })}>
          Let the fun begin!
        </Link>
      </div>

      <div className="mt-14 grid w-full gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Search Fast</CardTitle>
            <CardDescription>Google Books-backed discovery</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-[var(--muted)]">
            Find titles by author, title, or ISBN and import to local storage in
            one tap.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cache Reliable</CardTitle>
            <CardDescription>Local database copy</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-[var(--muted)]">
            Imported books are cached in Postgres and used for book detail
            rendering.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Milestone Ready</CardTitle>
            <CardDescription>Foundation for clubs</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-[var(--muted)]">
            Auth and books are in place so clubs, threads, shelves, and reviews
            can layer on next.
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

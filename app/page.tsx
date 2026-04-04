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
import { getAuthenticatedSessionDestination } from "@/lib/auth/redirects";
import { getAuthSession } from "@/lib/auth/server";

export default async function Page() {
  const session = await getAuthSession();
  const sessionUser = session?.user?.id ? session.user : null;
  if (sessionUser) {
    redirect(getAuthenticatedSessionDestination(sessionUser));
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-start justify-center px-4 py-14 sm:px-6 lg:px-8">
      <p className="mb-4 rounded-full border border-(--border) bg-(--surface) px-3 py-1 text-sm text-(--muted)">
        Book by Book
      </p>
      <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
        A social home for your reading life.
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-(--muted)">
        Discover books, organize them on personal shelves, read together in
        clubs, and leave reviews and discussions that stay tied to each title.
      </p>

      <div className="mt-8">
        <Link href="/signin" className={buttonStyles({ size: "lg" })}>
          Start your reading life
        </Link>
      </div>

      <div className="mt-14 grid w-full gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Read together in clubs</CardTitle>
            <CardDescription>Shared boards and book threads</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-(--muted)">
            Track what your club wants to read, is reading, and has finished,
            then keep every discussion anchored to the book itself.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Build personal shelves</CardTitle>
            <CardDescription>Private or public reading lists</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-(--muted)">
            Create custom shelves for themes, moods, and reading projects, add
            notes, and share the lists you want others to browse.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Review books, not just lists</CardTitle>
            <CardDescription>Ratings that stay with the book</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-(--muted)">
            Leave your take on the book detail page, build a reviewed history,
            and see how other readers responded to the same title.
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

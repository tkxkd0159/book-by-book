import Link from "next/link";

import SignOutButton from "@/components/auth/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { getAuthSession } from "@/lib/auth/server";

export default async function ProtectedLayout({ children }: Props.Layout) {
  const session = await getAuthSession();
  const userEmail = session?.user?.email ?? "Signed-in user";

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[var(--surface-strong)]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Link href="/books/search" className="text-lg font-semibold">
              Book by Book
            </Link>
            <Badge>Milestone 1</Badge>
          </div>

          <nav className="flex items-center gap-2">
            <Link
              href="/books/search"
              className={buttonStyles({ variant: "ghost", size: "sm" })}
            >
              Search
            </Link>
            <SignOutButton />
          </nav>
        </div>
        <div className="mx-auto w-full max-w-6xl px-4 pb-4 text-sm text-[var(--muted)] sm:px-6 lg:px-8">
          Signed in as {userEmail}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

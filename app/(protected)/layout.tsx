import { LibraryBig, Search } from "lucide-react";
import Link from "next/link";

import ProfileMenu from "@/components/auth/profile-menu";
import { ReactQueryProvider } from "@/components/providers/react-query-provider";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { requireCurrentUser } from "@/lib/auth/server";

export default async function ProtectedLayout({ children }: Props.Layout) {
  const currentUser = await requireCurrentUser();

  return (
    <ReactQueryProvider>
      <div className="min-h-screen">
        <header className="relative z-40 overflow-visible border-b border-(--border) bg-(--surface-strong)/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2">
              <Link href="/books/search" className="text-lg font-semibold">
                Book by Book
              </Link>
              <Badge>Milestone 3</Badge>
            </div>

            <nav className="relative z-50 flex items-center gap-2">
              <Link
                href="/books/search"
                className={buttonStyles({ variant: "ghost", size: "sm" })}
              >
                <Search aria-hidden className="h-4 w-4 shrink-0" />
                Search
              </Link>
              <Link
                href="/clubs"
                className={buttonStyles({ variant: "ghost", size: "sm" })}
              >
                <LibraryBig aria-hidden className="h-4 w-4 shrink-0" />
                Clubs
              </Link>
              <ProfileMenu
                name={currentUser.name}
                email={currentUser.email}
                imageUrl={currentUser.imageUrl}
              />
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </ReactQueryProvider>
  );
}

import { BookMarked, LibraryBig, Search } from "lucide-react";
import Link from "next/link";

import ProfileMenu from "@/components/auth/profile-menu";
import { ReactQueryProvider } from "@/components/providers/react-query-provider";
import { buttonStyles } from "@/components/ui/button";
import { requireCurrentUser } from "@/lib/auth/server";
import { getPublicUserIdentityLabel } from "@/lib/auth/users";
import { createMyShelvesHref } from "@/lib/shelves/view-paths";

const NAV_LINK_CLASS_NAME = buttonStyles({
  variant: "ghost",
  size: "sm",
  className:
    "h-10 rounded-full border border-transparent px-4 text-sm hover:border-(--border) hover:bg-(--surface-strong)",
});

export default async function ProtectedLayout({ children }: Props.Layout) {
  const currentUser = await requireCurrentUser();
  const displayName = getPublicUserIdentityLabel(currentUser);

  return (
    <ReactQueryProvider>
      <div className="min-h-screen">
        <header className="relative z-40 overflow-visible border-b border-(--border) bg-(--surface-strong)/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Link
                href="/books/search"
                className="text-4xl leading-none text-foreground"
                style={{ fontFamily: '"Romanesco", cursive' }}
              >
                Book by Book
              </Link>
            </div>

            <div className="relative z-50 flex flex-wrap items-center justify-end gap-2">
              <nav className="flex items-center gap-1 rounded-full border border-(--border) bg-(--surface)/80 p-1 shadow-sm">
                <Link href="/books/search" className={NAV_LINK_CLASS_NAME}>
                  <Search aria-hidden className="h-4 w-4 shrink-0" />
                  Search
                </Link>
                <Link href="/clubs" className={NAV_LINK_CLASS_NAME}>
                  <LibraryBig aria-hidden className="h-4 w-4 shrink-0" />
                  Clubs
                </Link>
                <Link href={createMyShelvesHref()} className={NAV_LINK_CLASS_NAME}>
                  <BookMarked aria-hidden className="h-4 w-4 shrink-0" />
                  Shelves
                </Link>
              </nav>
              <ProfileMenu
                name={displayName}
                email={currentUser.email}
                imageUrl={currentUser.imageUrl}
              />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </ReactQueryProvider>
  );
}

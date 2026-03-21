import Link from "next/link";

import ProfileMenu from "@/components/auth/profile-menu";
import {
  HeaderNav,
  type HeaderNavItem,
} from "@/components/navigation/header-nav";
import { ReactQueryProvider } from "@/components/providers/react-query-provider";
import { requireCurrentUser } from "@/lib/auth/server";
import { getPublicUserIdentityLabel } from "@/lib/auth/users";
import { createMyShelvesHref } from "@/lib/shelves/view-paths";

const NAV_ITEMS: readonly HeaderNavItem[] = [
  {
    href: "/books/search",
    icon: "search",
    label: "Search",
    matchPrefix: "/books",
  },
  {
    href: "/clubs",
    icon: "libraryBig",
    label: "Clubs",
  },
  {
    href: createMyShelvesHref(),
    icon: "bookMarked",
    label: "Shelves",
    matchPrefix: "/me/shelves",
  },
];

export default async function ProtectedLayout({ children }: Props.Layout) {
  const currentUser = await requireCurrentUser();
  const displayName = getPublicUserIdentityLabel(currentUser);

  return (
    <ReactQueryProvider>
      <div className="min-h-screen">
        <header className="relative z-40 overflow-visible border-b border-(--border) bg-(--surface-strong)/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-5 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-8">
              <Link
                href="/books/search"
                className="text-4xl leading-none text-foreground"
                style={{ fontFamily: '"Romanesco", cursive' }}
              >
                Book by Book
              </Link>
              <HeaderNav items={NAV_ITEMS} />
            </div>

            <div className="relative z-50 flex flex-wrap items-center justify-end gap-2">
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

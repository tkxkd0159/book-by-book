import Link from "next/link";

import ProfileMenu from "@/components/auth/profile-menu";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { getAuthSession, getCurrentUser } from "@/lib/auth/server";

export default async function ProtectedLayout({ children }: Props.Layout) {
  const session = await getAuthSession();
  const currentUser = await getCurrentUser();
  const userName = currentUser?.name ?? session?.user?.name ?? null;
  const userEmail = currentUser?.email ?? session?.user?.email ?? null;
  const userImageUrl = currentUser?.imageUrl ?? session?.user?.image ?? null;

  return (
    <div className="min-h-screen">
      <header className="relative z-40 overflow-visible border-b border-(--border) bg-(--surface-strong)/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Link href="/books/search" className="text-lg font-semibold">
              Book by Book
            </Link>
            <Badge>Milestone 1</Badge>
          </div>

          <nav className="relative z-50 flex items-center gap-2">
            <Link
              href="/books/search"
              className={buttonStyles({ variant: "ghost", size: "sm" })}
            >
              Search
            </Link>
            <ProfileMenu
              name={userName}
              email={userEmail}
              imageUrl={userImageUrl}
            />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

import Link from "next/link";

import {
  HeaderNav,
  type HeaderNavItem,
} from "@/components/navigation/header-nav";
import ProfileMenu from "@/components/auth/profile-menu";
import { requireInternalAdminUser } from "@/lib/auth/server";

const NAV_ITEMS: readonly HeaderNavItem[] = [
  {
    href: "/admin/invitation-codes",
    icon: "shield",
    label: "Invitation codes",
    matchPrefix: "/admin",
  },
];

export default async function AdminProtectedLayout({ children }: Props.Layout) {
  const currentUser = await requireInternalAdminUser();
  const displayName = currentUser.name ?? currentUser.email ?? "Internal admin";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#faf5eb_0%,#f5efe4_100%)]">
      <header className="border-b border-(--border) bg-(--surface-strong)/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-5 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link
              href="/admin/invitation-codes"
              className="text-4xl leading-none text-foreground"
              style={{ fontFamily: '"Romanesco", cursive' }}
            >
              Book by Book
            </Link>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-(--muted)">
              Admin Panel
            </p>
            <HeaderNav items={NAV_ITEMS} />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <ProfileMenu
              name={displayName}
              email={currentUser.email}
              imageUrl={currentUser.imageUrl}
              links={[
                {
                  href: "/admin/invitation-codes",
                  label: "Invitation codes",
                  kind: "admin",
                },
              ]}
              signOutCallbackUrl="/admin/signin"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

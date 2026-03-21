import { Shield } from "lucide-react";
import Link from "next/link";

import ProfileMenu from "@/components/auth/profile-menu";
import { buttonStyles } from "@/components/ui/button";
import { requireInternalAdminUser } from "@/lib/auth/server";

const NAV_LINK_CLASS_NAME = buttonStyles({
  variant: "ghost",
  size: "sm",
  className:
    "h-10 rounded-full border border-transparent px-4 text-sm hover:border-(--border) hover:bg-(--surface-strong)",
});

export default async function AdminProtectedLayout({ children }: Props.Layout) {
  const currentUser = await requireInternalAdminUser();
  const displayName = currentUser.name ?? currentUser.email ?? "Internal admin";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#faf5eb_0%,#f5efe4_100%)]">
      <header className="border-b border-(--border) bg-(--surface-strong)/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/invitation-codes"
              className="text-4xl leading-none text-foreground"
              style={{ fontFamily: '"Romanesco", cursive' }}
            >
              Book by Book
            </Link>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--muted)">
                Admin
              </p>
              <h1 className="text-lg font-semibold text-foreground">
                Invitation code control room
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <nav className="flex items-center gap-1 rounded-full border border-(--border) bg-(--surface)/80 p-1 shadow-sm">
              <Link href="/admin/invitation-codes" className={NAV_LINK_CLASS_NAME}>
                <Shield aria-hidden className="h-4 w-4 shrink-0" />
                Invitation codes
              </Link>
            </nav>
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

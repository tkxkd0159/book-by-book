import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { buttonStyles } from "@/components/ui/button";
import { requireInternalAdminUser } from "@/lib/auth/server";

export default async function AdminProtectedLayout({ children }: Props.Layout) {
  const currentUser = await requireInternalAdminUser();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#faf5eb_0%,#f5efe4_100%)]">
      <header className="border-b border-(--border) bg-(--surface-strong)/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--muted)">
              Book by Book Admin
            </p>
            <h1 className="text-2xl font-semibold text-foreground">
              Invitation code control room
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right text-sm">
              <p className="font-medium text-foreground">
                {currentUser.name ?? currentUser.email ?? "Internal admin"}
              </p>
              <p className="text-(--muted)">{currentUser.email}</p>
            </div>
            <Link
              href="/admin/invitation-codes"
              className={buttonStyles({ variant: "ghost", size: "sm" })}
            >
              Codes
            </Link>
            <SignOutButton variant="secondary" size="sm">
              Sign out
            </SignOutButton>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

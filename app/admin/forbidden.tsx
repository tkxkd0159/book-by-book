import { LockKeyhole, Shield } from "lucide-react";
import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { buttonStyles } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  createAdminSignInHref,
  DEFAULT_ADMIN_SIGNIN_PATH,
  DEFAULT_INTERNAL_ADMIN_PATH,
  readAuthCallbackUrlFromRequest,
} from "@/lib/auth/redirects";

function resolveAdminReturnTo(requestPath: string) {
  if (requestPath === DEFAULT_ADMIN_SIGNIN_PATH) {
    return DEFAULT_INTERNAL_ADMIN_PATH;
  }

  return requestPath;
}

export default async function AdminForbiddenPage() {
  const requestPath = await readAuthCallbackUrlFromRequest(
    DEFAULT_INTERNAL_ADMIN_PATH,
  );
  const callbackUrl = createAdminSignInHref(
    resolveAdminReturnTo(requestPath),
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-4 py-14 sm:px-6 lg:px-8">
      <div className="relative w-full overflow-hidden rounded-4xl border border-(--border) bg-(--surface-strong) px-6 py-12 shadow-[0_20px_50px_rgba(42,32,18,0.08)] sm:px-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-[#ff0084] via-[#ff5ca8] to-[#0f6152]" />

        <div className="mx-auto max-w-3xl space-y-8 text-center">
          <div className="space-y-4">
            <Badge className="bg-(--surface)">Admin Access</Badge>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[linear-gradient(135deg,#fff2fb,#eef9f5)] shadow-[0_10px_24px_rgba(42,32,18,0.08)]">
              <Shield aria-hidden className="h-9 w-9 text-[#ff0084]" />
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold sm:text-5xl">
                Admins only
              </h1>
              <p className="mx-auto max-w-2xl text-base leading-7 text-(--muted) sm:text-lg">
                This area is reserved for internal admins. If you need admin
                access, switch accounts and sign in with your admin credentials.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-(--border)/80 bg-white/70 text-left">
              <CardContent className="space-y-3 p-5 pt-5">
                <div className="flex items-center gap-3">
                  <LockKeyhole aria-hidden className="h-5 w-5 text-(--accent)" />
                  <p className="text-lg font-semibold">Restricted controls</p>
                </div>
                <p className="text-sm leading-6 text-(--muted)">
                  Invitation-code management and other internal controls stay
                  behind admin-only authentication.
                </p>
              </CardContent>
            </Card>

            <Card className="border-(--border)/80 bg-white/70 text-left">
              <CardContent className="space-y-3 p-5 pt-5">
                <div className="flex items-center gap-3">
                  <Shield aria-hidden className="h-5 w-5 text-[#ff0084]" />
                  <p className="text-lg font-semibold">Switch account</p>
                </div>
                <p className="text-sm leading-6 text-(--muted)">
                  Use the admin login flow to sign out of the current member
                  session and continue with an internal admin account.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <SignOutButton callbackUrl={callbackUrl} size="lg">
              Log in as admin
            </SignOutButton>
            <Link
              href="/books/search"
              className={buttonStyles({ variant: "secondary", size: "lg" })}
            >
              Back to books
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

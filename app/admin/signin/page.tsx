import { forbidden, redirect } from "next/navigation";

import { AdminSignInForm } from "@/components/admin/admin-signin-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DEFAULT_INTERNAL_ADMIN_PATH,
  getAuthenticatedSessionDestination,
  normalizeSafeCallbackUrl,
} from "@/lib/auth/redirects";
import { getAuthIdentity } from "@/lib/auth/server";

function extractSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function AdminSignInPage({ searchParams }: Props.Page) {
  const params = await searchParams;
  const callbackUrl = normalizeSafeCallbackUrl(
    extractSearchParam(params.callbackUrl) || DEFAULT_INTERNAL_ADMIN_PATH,
    DEFAULT_INTERNAL_ADMIN_PATH,
  );
  const authIdentity = await getAuthIdentity();

  if (authIdentity) {
    if (!authIdentity.isInternalAdmin) {
      forbidden();
    }

    redirect(getAuthenticatedSessionDestination(authIdentity, callbackUrl));
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-14 sm:px-6 lg:px-8">
      <Card className="w-full border-2 bg-(--surface-strong)">
        <CardHeader>
          <CardTitle className="text-3xl">Internal admin sign-in</CardTitle>
          <CardDescription>
            Invitation-code management is restricted to manually provisioned internal admins.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminSignInForm callbackUrl={callbackUrl} />
        </CardContent>
      </Card>
    </main>
  );
}

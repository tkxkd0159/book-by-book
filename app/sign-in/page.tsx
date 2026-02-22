import { redirect } from "next/navigation";

import SignInGoogleButton from "@/components/auth/sign-in-google-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthSession } from "@/lib/auth/server";

type SignInPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const errorMessages: Record<string, string> = {
  AccessDenied: "Google sign-in was denied.",
  OAuthSignin: "Failed to start Google sign-in. Try again.",
  OAuthCallback: "Google callback failed. Try again.",
  OAuthCreateAccount: "Could not create your account. Try again.",
  Callback: "Authentication callback failed. Try again.",
  Default: "Sign-in failed. Try again.",
};

function extractSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await getAuthSession();
  if (session) {
    redirect("/books/search");
  }

  const params = await searchParams;
  const errorCode = extractSearchParam(params.error);
  const errorMessage = errorMessages[errorCode];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-14 sm:px-6 lg:px-8">
      <Card className="w-full border-2 bg-[var(--surface-strong)]">
        <CardHeader>
          <CardTitle className="text-3xl">Sign in to Book by Book</CardTitle>
          <CardDescription>
            Google login is required for milestone 1 and ready for future provider
            extensions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage ? (
            <p className="rounded-md border border-[#d39e95] bg-[#fff2ef] p-3 text-sm text-[#7e1f14]">
              {errorMessage}
            </p>
          ) : null}

          <SignInGoogleButton callbackUrl="/books/search" />

          <p className="text-sm text-[var(--muted)]">
            By signing in, you agree to use Google OAuth for account access.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

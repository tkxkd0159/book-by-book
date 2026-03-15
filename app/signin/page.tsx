import { redirect } from "next/navigation";

import SignInGoogleButton from "@/components/auth/sign-in-google-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { resolveAuthErrorMessage } from "@/lib/auth/error-messages";
import { getCurrentUser } from "@/lib/auth/server";

function extractSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function normalizeCallbackUrl(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/books/search";
  }

  return value;
}

export default async function SignInPage({ searchParams }: Props.Page) {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    redirect("/books/search");
  }

  const params = await searchParams;
  const errorCode = extractSearchParam(params.error);
  const errorMessage = resolveAuthErrorMessage(errorCode);
  const callbackUrl = normalizeCallbackUrl(
    extractSearchParam(params.callbackUrl) || "/books/search",
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-14 sm:px-6 lg:px-8">
      <Card className="w-full border-2 bg-(--surface-strong)">
        <CardHeader>
          <CardTitle className="text-3xl">Sign in to Book by Book</CardTitle>
          <CardDescription>
            Google login is required for milestone 1 and ready for future
            provider extensions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage ? (
            <p className="rounded-md border border-[#d39e95] bg-[#fff2ef] p-3 text-sm text-[#7e1f14]">
              {errorMessage}
            </p>
          ) : null}

          <SignInGoogleButton callbackUrl={callbackUrl} />
        </CardContent>
      </Card>
    </main>
  );
}

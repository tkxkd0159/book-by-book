import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { resolveAuthErrorMessage } from "@/lib/auth/error-messages";

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

export default async function AuthErrorPage({ searchParams }: Props.Page) {
  const params = await searchParams;
  const errorCode = extractSearchParam(params.error);
  const callbackUrl = normalizeCallbackUrl(
    extractSearchParam(params.callbackUrl) || "/books/search",
  );
  const signInHref = `/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const errorMessage =
    resolveAuthErrorMessage(errorCode) ?? "Sign-in failed. Try again.";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-14 sm:px-6 lg:px-8">
      <Card className="w-full border-2 bg-(--surface-strong)">
        <CardHeader>
          <CardTitle className="text-3xl">Authentication error</CardTitle>
          <CardDescription>
            We could not complete the sign-in flow. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="rounded-md border border-[#d39e95] bg-[#fff2ef] p-3 text-sm text-[#7e1f14]">
            {errorMessage}
          </p>

          {errorCode ? (
            <p className="text-xs text-(--muted)">Error code: {errorCode}</p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Link href={signInHref} className={buttonStyles({ size: "lg" })}>
              Back to sign-in
            </Link>
            <Link
              href="/"
              className={buttonStyles({ size: "lg", variant: "secondary" })}
            >
              Go home
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

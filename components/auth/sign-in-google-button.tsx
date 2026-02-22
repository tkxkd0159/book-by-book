"use client";

import { useTransition } from "react";

import { signIn } from "next-auth/react";

import { buttonStyles } from "@/components/ui/button";

type SignInGoogleButtonProps = {
  callbackUrl?: string;
};

export default function SignInGoogleButton({
  callbackUrl = "/books/search",
}: SignInGoogleButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className={buttonStyles({ size: "lg" })}
      disabled={isPending}
      onClick={() => {
        startTransition(() => {
          void signIn("google", { callbackUrl });
        });
      }}
    >
      {isPending ? "Redirecting..." : "Sign in with Google"}
    </button>
  );
}

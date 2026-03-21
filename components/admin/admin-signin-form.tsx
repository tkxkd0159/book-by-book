"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AdminSignInFormProps = {
  callbackUrl: string;
};

export function AdminSignInForm({ callbackUrl }: AdminSignInFormProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const email = typeof formData.get("email") === "string" ? formData.get("email") : "";
        const password =
          typeof formData.get("password") === "string" ? formData.get("password") : "";

        setErrorMessage(null);
        startTransition(() => {
          void signIn("internal", {
            email,
            password,
            callbackUrl,
            redirect: false,
          }).then((result) => {
            if (!result || result.error) {
              setErrorMessage(
                result?.error ?? "Sign-in failed. Check the details you provided are correct.",
              );
              return;
            }

            router.push(result.url ?? callbackUrl);
            router.refresh();
          });
        });
      }}
    >
      {errorMessage ? (
        <p className="rounded-md border border-[#d39e95] bg-[#fff2ef] p-3 text-sm text-[#7e1f14]">
          {errorMessage}
        </p>
      ) : null}

      <label className="space-y-2 text-sm font-medium text-foreground">
        <span>Email</span>
        <Input
          name="email"
          type="email"
          autoComplete="username"
          placeholder="admin@book-by-book.com"
          required
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-foreground">
        <span>Password</span>
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          required
        />
      </label>

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Signing in..." : "Sign in to admin"}
      </Button>
    </form>
  );
}

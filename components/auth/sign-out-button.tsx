"use client";

import { useTransition } from "react";

import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

export default function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(() => {
          void signOut({ callbackUrl: "/sign-in" });
        });
      }}
    >
      {isPending ? "Signing out..." : "Sign out"}
    </Button>
  );
}

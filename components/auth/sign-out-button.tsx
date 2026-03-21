"use client";

import { useTransition } from "react";

import { signOutClientSession } from "@/components/auth/client-sign-out";
import { Button, type ButtonProps } from "@/components/ui/button";

type SignOutButtonProps = Omit<ButtonProps, "onClick" | "type"> & {
  callbackUrl?: string;
};

export function SignOutButton({
  callbackUrl = "/signin",
  children,
  ...props
}: SignOutButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      {...props}
      disabled={isPending || props.disabled}
      onClick={() => {
        startTransition(() => {
          void signOutClientSession(callbackUrl);
        });
      }}
    >
      {children ?? (isPending ? "Signing out..." : "Sign out")}
    </Button>
  );
}

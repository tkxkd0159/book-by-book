"use client";

import { useTransition } from "react";

import { signOut } from "next-auth/react";

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
          void signOut({ callbackUrl });
        });
      }}
    >
      {children ?? (isPending ? "Signing out..." : "Sign out")}
    </Button>
  );
}

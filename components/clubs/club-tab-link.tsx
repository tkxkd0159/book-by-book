"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ClubTabLinkProps = {
  children: ReactNode;
  href: ComponentProps<typeof Link>["href"];
  isActive: boolean;
};

function TabPendingHint({ enabled }: { enabled: boolean }) {
  const { pending } = useLinkStatus();

  return (
    <span aria-hidden className="flex h-3 w-3 items-center justify-center">
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full bg-current transition-all duration-150",
          enabled && pending
            ? "scale-100 opacity-75 delay-100"
            : "scale-75 opacity-0",
        )}
      />
    </span>
  );
}

export function ClubTabLink({
  children,
  href,
  isActive,
}: ClubTabLinkProps) {
  return (
    <Link
      href={href}
      prefetch={isActive ? false : true}
      aria-current={isActive ? "page" : undefined}
      className={buttonStyles({
        variant: isActive ? "default" : "secondary",
        size: "sm",
        className: isActive
          ? "shadow-[0_8px_18px_rgba(15,97,82,0.18)]"
          : "",
      })}
    >
      <span className="inline-flex items-center gap-2">
        <span>{children}</span>
        <TabPendingHint enabled={!isActive} />
      </span>
    </Link>
  );
}

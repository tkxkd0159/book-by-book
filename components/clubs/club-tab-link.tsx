"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { buttonStyles } from "@/components/ui/button";

type ClubTabLinkProps = {
  children: ReactNode;
  href: ComponentProps<typeof Link>["href"];
  isActive: boolean;
};

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
      {children}
    </Link>
  );
}

"use client";

import { BookMarked, LibraryBig, Search, Shield } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS = {
  bookMarked: BookMarked,
  libraryBig: LibraryBig,
  search: Search,
  shield: Shield,
} as const;

type HeaderNavItem = {
  href: string;
  icon: keyof typeof ICONS;
  label: string;
  matchPrefix?: string;
};

type HeaderNavProps = {
  items: readonly HeaderNavItem[];
};

function isActivePath(pathname: string, item: HeaderNavItem) {
  const matchPath = item.matchPrefix ?? item.href;
  return pathname === matchPath || pathname.startsWith(`${matchPath}/`);
}

export function HeaderNav({ items }: HeaderNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1.5 sm:gap-4">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const isActive = isActivePath(pathname, item);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`group relative inline-flex h-10 items-center gap-2 px-1 text-sm font-medium transition ${
              isActive
                ? "text-foreground"
                : "text-(--muted) hover:text-foreground"
            }`}
          >
            <Icon
              aria-hidden
              className={`h-4 w-4 shrink-0 transition ${
                isActive
                  ? "text-foreground"
                  : "text-(--muted) group-hover:text-foreground"
              }`}
            />
            <span>{item.label}</span>
            <span
              aria-hidden
              className={`absolute inset-x-1 -bottom-1 h-0.5 rounded-full bg-[#ff0084] transition-opacity ${
                isActive ? "opacity-100" : "opacity-0 group-hover:opacity-70"
              }`}
            />
          </Link>
        );
      })}
    </nav>
  );
}

export type { HeaderNavItem };

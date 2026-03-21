"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { LogOut, Shield, User } from "lucide-react";

import { signOutClientSession } from "@/components/auth/client-sign-out";
import { UserAvatar } from "@/components/auth/user-avatar";

type ProfileMenuLink = {
  href: string;
  label: string;
  kind?: "admin" | "profile";
};

type ProfileMenuProps = {
  name?: string | null;
  email?: string | null;
  imageUrl?: string | null;
  links?: readonly ProfileMenuLink[];
  signOutCallbackUrl?: string;
};

const DEFAULT_LINKS: readonly ProfileMenuLink[] = [
  { href: "/me", label: "Profile", kind: "profile" },
];

function MenuLinkIcon({ kind }: { kind?: ProfileMenuLink["kind"] }) {
  if (kind === "admin") {
    return <Shield aria-hidden className="h-4 w-4 shrink-0" />;
  }

  return <User aria-hidden className="h-4 w-4 shrink-0" />;
}

export default function ProfileMenu({
  name,
  email,
  imageUrl,
  links = DEFAULT_LINKS,
  signOutCallbackUrl = "/signin",
}: ProfileMenuProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && !containerRef.current.contains(target)) {
        setIsOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative z-50">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Open profile menu"
        className="rounded-full outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-(--accent-soft)"
        onClick={() => setIsOpen((open) => !open)}
      >
        <UserAvatar
          name={name}
          email={email}
          imageUrl={imageUrl}
          alt="Profile avatar"
          fallbackVariant="person"
          className="h-10 w-10 border border-(--border) bg-(--surface-strong) text-sm font-semibold text-foreground shadow-sm"
        />
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 z-90 mt-2 w-64 rounded-2xl border border-(--border) bg-(--surface-strong) p-1.5 shadow-[0_14px_26px_rgba(42,32,18,0.16)]"
        >
          <div className="rounded-xl border border-transparent px-3 py-3">
            <p className="text-sm font-semibold">
              {name || "Book by Book Member"}
            </p>
            <p className="truncate text-xs text-(--muted)">
              {email || "No email"}
            </p>
          </div>

          <div className="space-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                role="menuitem"
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-foreground transition hover:bg-(--surface)"
                onClick={() => setIsOpen(false)}
              >
                <MenuLinkIcon kind={link.kind} />
                <span>{link.label}</span>
              </Link>
            ))}
          </div>

          <button
            type="button"
            role="menuitem"
            disabled={isPending}
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-[#7e1f14] transition hover:bg-[#fff2ef] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => {
              setIsOpen(false);
              startTransition(() => {
                void signOutClientSession(signOutCallbackUrl);
              });
            }}
          >
            <LogOut aria-hidden className="h-4 w-4 shrink-0" />
            <span>{isPending ? "Signing out..." : "Sign out"}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { signOut } from "next-auth/react";
import { UserAvatar } from "@/components/auth/user-avatar";

type ProfileMenuProps = {
  name?: string | null;
  email?: string | null;
  imageUrl?: string | null;
};

export default function ProfileMenu({
  name,
  email,
  imageUrl,
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
        className="flex items-center gap-1 rounded-full p-0.5 outline-none ring-(--border) transition hover:bg-black/5 focus-visible:ring-2"
        onClick={() => setIsOpen((open) => !open)}
      >
        <UserAvatar
          name={name}
          email={email}
          imageUrl={imageUrl}
          alt="Profile avatar"
          className="h-10 w-10 border border-(--border) bg-(--surface) text-sm font-semibold text-foreground"
        />
        <span
          aria-hidden
          className={`pr-1 text-(--muted) transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.126l3.71-3.895a.75.75 0 111.08 1.04l-4.25 4.461a.75.75 0 01-1.08 0l-4.25-4.46a.75.75 0 01.02-1.061z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 z-90 mt-2 w-56 rounded-xl border border-(--border) bg-(--surface-strong) p-1 shadow-[0_14px_26px_rgba(42,32,18,0.16)]"
        >
          <div className="rounded-lg px-3 py-2">
            <p className="text-sm font-semibold">
              {name || "Book by Book Member"}
            </p>
            <p className="truncate text-xs text-(--muted)">
              {email || "No email"}
            </p>
          </div>

          <Link
            href="/me"
            role="menuitem"
            className="block rounded-lg px-3 py-2 text-sm text-foreground transition hover:bg-(--surface)"
            onClick={() => setIsOpen(false)}
          >
            Profile
          </Link>

          <button
            type="button"
            role="menuitem"
            disabled={isPending}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-[#7e1f14] transition hover:bg-[#fff2ef] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => {
              setIsOpen(false);
              startTransition(() => {
                void signOut({ callbackUrl: "/signin" });
              });
            }}
          >
            {isPending ? "Signing out..." : "Sign out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

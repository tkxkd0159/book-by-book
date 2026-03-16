"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

type ModalShellProps = {
  open: boolean;
  onClose: () => void;
  titleId: string;
  children: ReactNode;
  contentClassName?: string;
  rootName?: string;
};

export function ModalShell({
  open,
  onClose,
  titleId,
  children,
  contentClassName,
  rootName = "default",
}: ModalShellProps) {
  const portalRoot = typeof document === "undefined" ? null : document.body;

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open || !portalRoot) {
    return null;
  }

  return createPortal(
    <div
      data-modal-root={rootName}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6 sm:px-6 sm:py-10"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "w-full rounded-2xl border border-(--border) bg-(--surface-strong) shadow-[0_24px_60px_rgba(32,24,14,0.28)]",
          "max-w-xl",
          contentClassName,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    portalRoot,
  );
}

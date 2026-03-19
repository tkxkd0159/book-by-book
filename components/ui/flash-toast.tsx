"use client";

import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

type FlashToastProps = {
  message?: string | null;
  error?: string | null;
  durationMs?: number;
};

type FlashToastItem = {
  id: "message" | "error";
  kind: "success" | "error";
  text: string;
};

function buildToastItems(message: string | null, error: string | null) {
  const items: FlashToastItem[] = [];

  if (message) {
    items.push({
      id: "message",
      kind: "success",
      text: message,
    });
  }

  if (error) {
    items.push({
      id: "error",
      kind: "error",
      text: error,
    });
  }

  return items;
}

export function FlashToast({
  message = null,
  error = null,
  durationMs = 1500,
}: FlashToastProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const items = useMemo(
    () => buildToastItems(message, error),
    [message, error],
  );
  const [visibleIds, setVisibleIds] = useState(() =>
    items.map((item) => item.id),
  );

  const clearFlashQueryParams = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("message");
    params.delete("error");
    params.delete("focusReview");

    const hash = window.location.hash;
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}${hash}`, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  function dismissToast(id: FlashToastItem["id"]) {
    const next = visibleIds.filter((entry) => entry !== id);
    setVisibleIds(next);

    if (next.length === 0) {
      clearFlashQueryParams();
    }
  }

  useEffect(() => {
    if (items.length === 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setVisibleIds([]);
      clearFlashQueryParams();
    }, durationMs);

    return () => window.clearTimeout(timeoutId);
  }, [durationMs, items, clearFlashQueryParams]);

  const visibleItems = items.filter((item) => visibleIds.includes(item.id));

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(26rem,calc(100vw-2rem))] flex-col gap-3">
      {visibleItems.map((item) => (
        <div
          key={item.id}
          role={item.kind === "error" ? "alert" : "status"}
          className={
            item.kind === "error"
              ? "pointer-events-auto rounded-2xl border border-[#d39e95] bg-[#fff2ef] px-4 py-3 text-sm text-[#7e1f14] shadow-[0_20px_45px_rgba(126,31,20,0.16)]"
              : "pointer-events-auto rounded-2xl border border-[#b9d6cf] bg-[#eef9f5] px-4 py-3 text-sm text-[#125547] shadow-[0_20px_45px_rgba(18,85,71,0.14)]"
          }
        >
          <div className="flex items-start gap-3">
            {item.kind === "error" ? (
              <CircleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <p className="min-w-0 flex-1 leading-6">{item.text}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 rounded-full p-0"
              aria-label={`Dismiss ${item.kind === "error" ? "error" : "message"}`}
              onClick={() => dismissToast(item.id)}
            >
              <X aria-hidden className="h-4 w-4 shrink-0" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { RefObject } from "react";

import type { CursorPaginationResult } from "@/lib/threads/repository";

type UseInfiniteCursorFeedOptions<T> = {
  initialPage: CursorPaginationResult<T>;
  initialRestoreAfter?: string | null;
  initialFocusId?: string | null;
  fetchPage: (after: string) => Promise<CursorPaginationResult<T>>;
  hasFocusedItem: (items: T[], focusId: string) => boolean;
  getFocusElementId: (focusId: string) => string;
};

type UseInfiniteCursorFeedResult<T> = {
  items: T[];
  hasMore: boolean;
  isLoadingMore: boolean;
  errorMessage: string | null;
  sentinelRef: RefObject<HTMLDivElement | null>;
  loadMore: () => void;
  currentRestoreAfter: string | null;
};

function stripRestoreSearchParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete("after");
  url.searchParams.delete("focusThreadId");
  url.searchParams.delete("focusPostId");
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

export function useInfiniteCursorFeed<T>({
  initialPage,
  initialRestoreAfter = null,
  initialFocusId = null,
  fetchPage,
  hasFocusedItem,
  getFocusElementId,
}: UseInfiniteCursorFeedOptions<T>): UseInfiniteCursorFeedResult<T> {
  const [items, setItems] = useState(initialPage.items);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [endCursor, setEndCursor] = useState(initialPage.endCursor);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [restorePending, setRestorePending] = useState(
    Boolean(initialRestoreAfter || initialFocusId),
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const currentRestoreAfter = endCursor;

  const finishRestore = useCallback((focusId: string | null) => {
    const focusElementId = focusId ? getFocusElementId(focusId) : null;
    const shouldScrollToFocus = focusElementId
      ? window.location.hash === `#${focusElementId}`
      : false;

    setRestorePending(false);
    stripRestoreSearchParams();

    if (!focusElementId || !shouldScrollToFocus) {
      return;
    }

    window.requestAnimationFrame(() => {
      document
        .getElementById(focusElementId)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }, [getFocusElementId]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore || !nextCursor) {
      return;
    }

    loadingRef.current = true;
    setIsLoadingMore(true);
    setErrorMessage(null);

    try {
      const nextPage = await fetchPage(nextCursor);
      setItems((current) => [...current, ...nextPage.items]);
      setNextCursor(nextPage.nextCursor);
      setEndCursor(nextPage.endCursor);
      setHasMore(nextPage.hasMore);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not load more items. Please try again.",
      );
    } finally {
      loadingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [fetchPage, hasMore, nextCursor]);

  useEffect(() => {
    if (!restorePending) {
      return;
    }

    const hasFocus = initialFocusId
      ? hasFocusedItem(items, initialFocusId)
      : false;

    if (hasFocus) {
      finishRestore(initialFocusId);
      return;
    }

    if (initialRestoreAfter && currentRestoreAfter === initialRestoreAfter) {
      finishRestore(null);
      return;
    }

    if (!hasMore) {
      finishRestore(hasFocus ? initialFocusId : null);
      return;
    }

    if (errorMessage) {
      return;
    }

    void loadMore();
  }, [
    currentRestoreAfter,
    errorMessage,
    finishRestore,
    hasMore,
    hasFocusedItem,
    initialFocusId,
    initialRestoreAfter,
    items,
    loadMore,
    restorePending,
  ]);

  useEffect(() => {
    if (
      restorePending
      || !hasMore
      || errorMessage
      || typeof IntersectionObserver === "undefined"
      || !sentinelRef.current
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      {
        rootMargin: "320px 0px",
      },
    );

    observer.observe(sentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [errorMessage, hasMore, loadMore, restorePending]);

  return {
    items,
    hasMore,
    isLoadingMore,
    errorMessage,
    sentinelRef,
    loadMore,
    currentRestoreAfter,
  };
}

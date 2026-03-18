"use client";

import {
  useInfiniteQuery,
  type QueryKey,
} from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { RefObject } from "react";

import type { CursorPaginationResult } from "@/lib/threads/repository";

type UseInfiniteCursorFeedOptions<T> = {
  queryKey: QueryKey;
  restoreStateKey?: string | null;
  initialRestoreAfter?: string | null;
  initialFocusId?: string | null;
  fetchPage: (
    after: string | null,
    signal: AbortSignal,
  ) => Promise<CursorPaginationResult<T>>;
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
  queryKey,
  restoreStateKey = null,
  initialRestoreAfter = null,
  initialFocusId = null,
  fetchPage,
  hasFocusedItem,
  getFocusElementId,
}: UseInfiniteCursorFeedOptions<T>): UseInfiniteCursorFeedResult<T> {
  const [restorePending, setRestorePending] = useState(
    Boolean(initialRestoreAfter || initialFocusId),
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage = false,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => fetchPage(pageParam, signal),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
  const pages = data?.pages ?? [];
  const items = pages.flatMap((page) => page.items);
  const currentRestoreAfter = pages.at(-1)?.endCursor ?? null;
  const errorMessage =
    error instanceof Error ? error.message : null;

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
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }

    try {
      await fetchNextPage();
    } catch {
      // TanStack Query owns the error state surfaced through `error`.
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const deferFinishRestore = useCallback((focusId: string | null) => {
    window.requestAnimationFrame(() => {
      finishRestore(focusId);
    });
  }, [finishRestore]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRestorePending(Boolean(initialRestoreAfter || initialFocusId));
  }, [initialFocusId, initialRestoreAfter, restoreStateKey]);

  useEffect(() => {
    if (!restorePending) {
      return;
    }

    const hasFocus = initialFocusId
      ? hasFocusedItem(items, initialFocusId)
      : false;
    const hasRestoredAfter = initialRestoreAfter
      ? currentRestoreAfter === initialRestoreAfter
      : true;

    if (hasFocus && hasRestoredAfter) {
      deferFinishRestore(initialFocusId);
      return;
    }

    if (!initialFocusId && hasRestoredAfter) {
      deferFinishRestore(null);
      return;
    }

    if (!hasNextPage) {
      deferFinishRestore(hasFocus ? initialFocusId : null);
      return;
    }

    if (errorMessage) {
      return;
    }

    if (!isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [
    currentRestoreAfter,
    deferFinishRestore,
    errorMessage,
    fetchNextPage,
    finishRestore,
    hasFocusedItem,
    hasNextPage,
    initialFocusId,
    initialRestoreAfter,
    isFetchingNextPage,
    items,
    restorePending,
  ]);

  useEffect(() => {
    if (
      restorePending
      || !hasNextPage
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
  }, [errorMessage, hasNextPage, loadMore, restorePending]);

  return {
    items,
    hasMore: hasNextPage,
    isLoadingMore: isFetchingNextPage,
    errorMessage,
    sentinelRef,
    loadMore,
    currentRestoreAfter,
  };
}

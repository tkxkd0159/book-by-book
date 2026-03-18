import type { InfiniteData, QueryClient, QueryKey } from "@tanstack/react-query";

import type { CursorPaginationResult } from "@/lib/threads/repository";

export function seedInfiniteQueryPage<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  page: CursorPaginationResult<T>,
) {
  queryClient.setQueryData(
    queryKey,
    {
      pageParams: [null],
      pages: [page],
    } satisfies InfiniteData<CursorPaginationResult<T>, string | null>,
  );
}

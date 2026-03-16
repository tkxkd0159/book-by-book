# Task 04: Thread Pinning and Pagination

## Goal
Add the moderation and list-scaling behavior that makes the first discussion experience usable as clubs accumulate more activity.

## Scope
- Add pin and unpin controls for `OWNER` and `ADMIN` users on thread surfaces where moderation makes sense.
- Enforce pinned-first ordering on the club-book thread list:
  - `is_pinned DESC`
  - `created_at DESC`
- Add basic page-number pagination for thread lists on `/clubs/[clubId]/books/[clubBookId]`.
- Add basic page-number pagination for post lists on `/clubs/[clubId]/threads/[threadId]`.
- Reuse the app's existing `searchParams` page pattern instead of introducing cursor pagination in this milestone.

## Implementation Notes
- Pinning is moderation, not personalization. Members who are not `OWNER` or `ADMIN` should never mutate `is_pinned`.
- Keep the first pagination implementation simple and stable:
  - explicit `page` query param
  - deterministic sort order
  - page metadata for previous and next navigation
- Pinned threads should still respect the same pagination window as non-pinned threads. The ordered list is paginated after sorting.
- Do not add route cache behavior that risks serving another user's membership state; keep these pages compatible with protected-route rendering.

## Acceptance Criteria
- Admin users can pin and unpin threads, and the updated order is reflected on the club-book page.
- Non-admin members cannot pin or unpin threads even if they attempt to call the server action directly.
- Thread and post pages support stable previous and next navigation via `?page=N`.
- Pagination does not duplicate or skip records when moving between pages with the same ordering rules.
- Thread lists continue to show pinned threads first across page loads.

## Expected Touchpoints
- `app/(protected)/clubs/[clubId]/books/[clubBookId]/page.tsx`
- `app/(protected)/clubs/[clubId]/threads/[threadId]/page.tsx`
- `components/threads/thread-pagination-controls.tsx`
- `components/threads/pin-thread-button.tsx`
- `lib/threads/repository.ts`

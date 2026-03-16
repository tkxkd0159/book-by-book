# Task 03: Thread Detail and Post Lifecycle

## Goal
Build `/clubs/[clubId]/threads/[threadId]` so members can read a thread and participate with posts.

## Scope
- Render the thread detail page with:
  - thread title and body
  - pinned badge when applicable
  - club-book context and link back to the parent club-book page
  - author and created-at metadata
- Render the paginated post list with:
  - author identity
  - body
  - created and edited timestamps
  - edit and delete controls only for the post author
- Add the post composer for current club members.
- Add the post edit and delete flows using soft delete semantics.
- Show read-only thread history for archived club books while still allowing new posts unless the thread itself is later locked in a future milestone.

## Implementation Notes
- Thread detail must verify both club membership and club/thread relationship to avoid cross-club IDOR bugs.
- Post mutations should be routed through shared repository and permission helpers from Task 01.
- Post delete should remove the body from the main timeline view in a user-friendly way while preserving row history via `deleted_at`.
- Thread edit, thread delete, and thread lock management are explicitly deferred.

## Acceptance Criteria
- Members can load a thread detail page and read its paginated posts.
- Members can add a post to a thread in a club they belong to.
- A post author can edit and delete only their own posts.
- Non-authors do not see working edit/delete paths for someone else's posts, and server-side checks still reject bypass attempts.
- Deleted posts do not disappear in a way that breaks pagination or conversation order.

## Expected Touchpoints
- `app/(protected)/clubs/[clubId]/threads/[threadId]/page.tsx`
- `components/threads/thread-post-list.tsx`
- `components/threads/post-composer.tsx`
- `components/threads/post-actions.tsx`
- `lib/threads/repository.ts`

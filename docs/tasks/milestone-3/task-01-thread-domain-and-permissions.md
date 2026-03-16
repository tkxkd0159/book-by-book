# Task 01: Thread Domain and Permissions

## Goal
Add the shared types, validation, repository helpers, and permission guards that every Milestone 3 discussion page and server action will reuse.

## Scope
- Extend [`types/db/index.ts`](../../types/db/index.ts) with discussion-facing records:
  - `ThreadRecord`
  - `ThreadPostRecord`
- Add a `lib/threads/` module set for:
  - input validation with Zod
  - permission helpers for member access, post authorship, and admin-only pinning
  - repository queries and mutations
  - thread-specific error types or result helpers
- Define stable repository contracts for downstream pages and actions:
  - list threads for a `clubBookId`
  - create a thread for an active `clubBookId`
  - fetch thread detail with paginated posts
  - create, edit, and soft-delete posts
  - pin and unpin threads
- Centralize transaction boundaries for:
  - thread creation
  - post creation and post updates
  - pin state changes

## Implementation Notes
- All read and write paths should verify club membership from reusable server-side helpers instead of page-local branching.
- Thread creation must confirm that the referenced `club_book` belongs to the same club and has `removed_at IS NULL`.
- Thread lists should ignore soft-deleted rows and order by `is_pinned DESC, created_at DESC`.
- Post edit and delete must be author-only in Milestone 3. Admin moderation of posts is out of scope.
- Use `deleted_at` soft delete semantics for posts so future moderation or audit views remain possible.

## Acceptance Criteria
- Discussion permissions are enforced from shared helpers instead of duplicated route logic.
- Repository functions return typed data shaped for App Router pages and server actions.
- Members can read discussion data only for clubs they belong to.
- Thread creation is rejected for archived club books.
- Non-authors cannot edit or delete another user's post.
- Only `OWNER` and `ADMIN` can pin or unpin threads.

## Expected Touchpoints
- `types/db/index.ts`
- `lib/threads/repository.ts`
- `lib/threads/permissions.ts`
- `lib/threads/validation.ts`
- `lib/threads/errors.ts` or equivalent

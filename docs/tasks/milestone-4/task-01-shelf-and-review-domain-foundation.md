# Task 01: Shelf and Review Domain Foundation

## Goal
Add the shared types, validation, repository helpers, and permission guards that every Milestone 4 shelf and review route or server action will reuse.

## Scope
- Extend the app-facing database types and domain contracts for:
  - shelf records
  - shelf item records
  - review records
  - review aggregate data used on book detail pages
- Add `lib/shelves/` and `lib/reviews/` module sets for:
  - input validation
  - permission helpers
  - repository queries and mutations
  - shelf- and review-specific error helpers
- Define stable repository contracts for downstream pages and server actions:
  - list a user's shelves
  - fetch shelf detail for owner and signed-in public readers
  - create, update, and delete shelves
  - add, remove, and update shelf items and notes
  - fetch a user's reviewed books
  - fetch book reviews and aggregate rating data
  - upsert and soft-delete reviews
- Reuse the existing book import/persistence foundation so shelf and review flows do not invent a second Google Books ingest path.

## Implementation Notes
- Treat the current schema as the starting point. No schema migration is part of the milestone plan unless a later implementation gap proves one is required.
- Permission helpers should distinguish:
  - shelf owner write access
  - signed-in public read access for `is_public = true`
  - review ownership for create/update/delete
- Review aggregate queries must ignore `deleted_at IS NOT NULL`.
- Keep `slug` out of Milestone 4 repository contracts and UI behavior.
- Shared add-book import logic should stay server-enforced. UI reuse is not required at this task.

## Acceptance Criteria
- Shelf and review permissions are enforced from reusable helpers instead of route-local branching.
- Repository functions return typed data shaped for App Router pages and server actions.
- Public shelf reads work only for signed-in users and only when `is_public = true`.
- Review write paths enforce one review per `(user_id, book_id)` and preserve the existing soft-delete model.
- Book review aggregate helpers return enough data to render average rating, review count, and recent review entries.

## Expected Touchpoints
- `types/db/index.ts`
- `lib/shelves/*`
- `lib/reviews/*`
- `lib/books/repository.ts` or adjacent shared import helpers

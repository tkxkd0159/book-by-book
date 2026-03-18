# Task 03: Shelf Item Add Remove and Notes

## Goal
Let users add books to personal shelves from existing book discovery surfaces, remove them later, and maintain per-item notes without introducing a second book-import workflow.

## Scope
- Add a shelf-specific add dialog on:
  - `/books/search`
  - `/books/[googleVolumeId]`
- Reuse the existing Google-volume import and `books` upsert path so shelf item creation uses the same server-side book persistence foundation as club-book addition.
- Add shelf item mutations for:
  - add book to shelf
  - remove book from shelf
  - update shelf item note
- Render shelf detail with the owned books and their notes.

## Implementation Notes
- Keep the shelf add UI separate from the current club add modal. Shared backend/domain logic is required; a single combined picker is not.
- Adding a book to a shelf should be idempotent per `(shelf_id, book_id)` and respect the existing unique constraint.
- Shelf item notes are in scope; manual reordering is not. Preserve `sort_order` for future work but do not introduce drag-and-drop or reorder controls in Milestone 4.
- Use the same book import behavior from search/detail that the app already trusts for club-book addition. Do not add a second import endpoint.
- Owner-only shelf item writes should be enforced on the server.

## Acceptance Criteria
- Users can add a searched or opened book to one or more of their shelves.
- Re-adding a book already on a shelf is handled gracefully.
- Users can remove shelf items from their own shelves.
- Users can create and update per-item notes on their own shelves.
- Public shelf readers can see shelf items and notes but cannot mutate them.

## Expected Touchpoints
- `components/books/*`
- `components/shelves/*`
- `app/(protected)/books/search/page.tsx`
- `app/(protected)/books/[googleVolumeId]/page.tsx`
- shelf item server actions

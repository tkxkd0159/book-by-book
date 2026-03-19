# Task 04: Reviews Book Detail and Reviewed Profile

## Goal
Add the first review workflow so users can rate books, maintain one review per book, and see those reviews reflected both on profile routes and on book detail pages.

## Scope
- Implement review routes:
  - `/me/reviewed`
  - `/me/reviews/[googleVolumeId]`
- Add review mutations for:
  - create or update review
  - delete review
- Update `/books/[googleVolumeId]` to render:
  - average rating
  - review count
  - reader reviews from signed-in users
  - a clear entry point to create or edit the current user's review
- Update `/me` with a reviewed-content entry point only. Shelf entry points already exist from Task 02.

## Implementation Notes
- Review UI requires a rating from 1 to 5. Review body is optional.
- Leave `reviews.title` and `contains_spoilers` out of the Milestone 4 UI unless implementation later proves they are necessary.
- Persist book data through the same book import foundation already used elsewhere before creating a review for a never-cached book.
- Review aggregates must exclude soft-deleted rows.
- Recent review lists on book detail pages should be ordered consistently, preferably by most recent update or creation timestamp.
- Public review reading remains inside the authenticated app; no unauthenticated review pages are part of this milestone.
- `/books/[googleVolumeId]` already contains the shared `Add Book` modal from Task 03. Task 04 should add review summary and review-entry controls without removing or redesigning that add-book surface.
- Task 04 should not revisit the combined add modal or the new Reading board shelf-import flow except where book-detail layout or regression coverage requires it.

## Acceptance Criteria
- A signed-in user can create one review per book and later update or delete it.
- `/me/reviewed` lists the user's reviewed books and links back to the review-edit route or book detail page.
- Book detail displays aggregate rating information derived from persisted reviews.
- Book detail shows a recent review list visible to signed-in readers.
- Deleting a review removes it from aggregate calculations and the reviewed list.
- Book detail still preserves the Task 03 `Add Book` flow for clubs and shelves after review UI is added.

## Expected Touchpoints
- `app/(protected)/me/reviewed/page.tsx`
- `app/(protected)/me/reviews/[googleVolumeId]/page.tsx`
- `app/(protected)/books/[googleVolumeId]/page.tsx`
- `components/reviews/*`
- review server actions and repository helpers

# Milestone 4: Personal Shelves + Reviews

## Goal
Deliver the first personal reading workflow on top of the existing auth, books, clubs, and discussion foundation:

- let users create and manage personal shelves
- let users add and remove books from shelves and maintain per-item notes
- let signed-in users read public shelves owned by other members
- let users create, edit, and delete one review per book
- show review aggregates and reader reviews on the book detail page
- add reviewed-book entry points to the profile

## Current Baseline
- `bookapp.shelves`, `shelf_items`, and `reviews` already exist in [`db/schema/data.sql`](../../db/schema/data.sql).
- Milestone 1 already provides Google Books search, import, and book detail pages.
- Milestone 2 already provides the reusable club-book add flow and protected navigation patterns.
- Milestone 3 already provides the current club-book detail surface and profile shell.
- No shelf-specific repository layer, route tree, UI, or tests exist yet.
- No review-specific repository layer, book-page aggregation surface, or reviewed-profile routes exist yet.

## Planning Assumptions
- Public shelves are in scope, but public visibility remains inside the authenticated app. Unauthenticated public pages stay out of scope.
- Public shelf routes use `shelfId`, not `slug`. The existing `slug` column remains intentionally unused in Milestone 4.
- Book add flows now use one shared `Add Book` modal with `Clubs` and `Shelves` tabs on search and detail pages, while shelf and club writes remain separate backend actions.
- Club admins and owners can now import eligible books from one of their shelves into `Want to Read` from Reading board management.
- Shelf items support add/remove and per-item notes. Manual shelf reordering is explicitly out of scope.
- Review UI requires a rating from 1 to 5 and allows an optional body. Review title and spoiler controls remain out of the Milestone 4 UI.
- Book detail should show average rating, review count, and a recent public review list based only on non-deleted reviews without regressing the shared Add Book modal.

## Delivery Order
1. [Task 01: Shelf and Review Domain Foundation](./task-01-shelf-and-review-domain-foundation.md)
2. [Task 02: Shelf Routes and Public Shelf Reading](./task-02-shelf-routes-and-public-shelf-reading.md)
3. [Task 03: Shelf Item Add Remove and Notes](./task-03-shelf-item-add-remove-and-notes.md)
4. [Task 04: Reviews Book Detail Surface and Reviewed Profile](./task-04-reviews-book-detail-and-reviewed-profile.md)
5. [Task 05: Quality Gates and Regression Coverage](./task-05-quality-gates-and-regression-coverage.md)

## Milestone Exit Criteria
- Authenticated users can create shelves, edit shelf metadata, and remove their own shelves.
- Users can add books to shelves from the book search and book detail surfaces, remove them, and maintain per-item notes.
- Signed-in users can open another member's public shelf by `shelfId`, while private shelves remain owner-only.
- Users can create, edit, and delete one review per book, and `/me/reviewed` reflects those changes.
- Book detail shows review aggregate data and a recent review list derived from persisted reviews.
- Milestone 4 passes `pnpm lint`, `pnpm build`, `pnpm test`, `pnpm test:integration`, and required Playwright coverage for the new shelf and review flows.

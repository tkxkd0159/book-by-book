# Task 04: Club Sections and Book Management

## Goal
Turn the club detail shell into the Milestone 2 reading board with server-enforced admin controls for club books.

## Scope
- Expand `/clubs/[clubId]` into the main club home view:
  - header with name, description, visibility, and membership state
  - mobile tabs for `Want to Read`, `Reading`, and `Read`
  - desktop multi-column layout for the same sections
- Render active `club_books` in section order with:
  - cover thumbnail
  - title
  - authors
  - section badge
  - link back to `/books/[googleVolumeId]` for Milestone 2
- Implement book-management actions for `OWNER` and `ADMIN`:
  - add book to a section
  - move book between sections
  - remove book from the club
- Use the existing book import/cache path as the source of truth:
  - if a selected Google volume is not yet in `books`, import it first
  - then create or reactivate the `club_books` row
- Provide at least one admin add-to-club entry point from an existing book surface. Recommended path:
  - add a club picker + target section control on `/books/[googleVolumeId]`
- Show read-only section content to non-admin members, and show join messaging to eligible non-members on public clubs.

## Implementation Notes
- Removal should set `removed_at` instead of deleting rows so Milestone 3 thread references remain viable.
- Re-adding a removed book should clear `removed_at`, assign the requested status, and place the book at the end of that section.
- The unique `(club_id, book_id)` constraint means add-book logic must update existing rows when the book is already present or archived.
- Reordering within a section is optional for this milestone; move-between-section support is required.

## Acceptance Criteria
- Club home renders all three sections with empty states when needed.
- Only `OWNER` and `ADMIN` can mutate club books, and server actions enforce the role check even if the UI is bypassed.
- Members can view section contents but cannot add, move, or remove books.
- Adding the same active book twice does not create duplicates.
- Removed books disappear from active lists and can later be restored through the add flow.

## Expected Touchpoints
- `app/(protected)/clubs/[clubId]/page.tsx`
- `app/(protected)/books/[googleVolumeId]/page.tsx`
- `components/clubs/club-section-board.tsx`
- `components/clubs/add-book-to-club-form.tsx`
- `components/clubs/club-book-card.tsx`
- `lib/clubs/repository.ts`

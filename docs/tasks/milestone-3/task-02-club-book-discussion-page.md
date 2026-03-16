# Task 02: Club Book Discussion Page

## Goal
Turn `/clubs/[clubId]/books/[clubBookId]` into the discussion hub for a book inside a club.

## Scope
- Build the club-book page with:
  - book cover, title, authors, and current section status
  - club context and link back to the club home board
  - archived-state messaging when the book has been removed from active sections
- Render the thread list for the current `clubBookId` with:
  - pinned-first ordering
  - title
  - optional body preview
  - author name
  - reply count or post count
  - created/updated timestamps
  - link to `/clubs/[clubId]/threads/[threadId]`
- Add the create-thread entry point for `MEMBER`+ users:
  - title required
  - body optional
  - disabled or hidden when the club book is archived
- Keep the page server-first so the thread list remains a read-heavy server-rendered surface.

## Implementation Notes
- The page should load from club membership and `clubBookId`, not from a free-floating `bookId`, to preserve club scoping.
- Use the existing `club_books` row as the source of truth for archived state and section label.
- Do not surface archived books from Milestone 2 section boards, but allow direct thread reads for existing archived book discussions.
- Empty state copy should distinguish between:
  - no threads yet for an active club book
  - archived club book where new threads are no longer allowed

## Acceptance Criteria
- Members can open a valid club-book page and see the thread list for that book in that club.
- Thread create succeeds only for active club books and only for current club members.
- Archived club books remain readable but do not allow thread creation.
- Thread cards sort pinned threads first and otherwise newest first.
- The page provides clear navigation between the club board, the club-book page, and thread detail.

## Expected Touchpoints
- `app/(protected)/clubs/[clubId]/books/[clubBookId]/page.tsx`
- `components/threads/club-book-thread-list.tsx`
- `components/threads/create-thread-form.tsx`
- `lib/threads/repository.ts`
- thread server actions for the club-book page

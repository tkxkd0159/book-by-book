# Milestone 3: Club Discussions

## Goal
Deliver the first club discussion workflow on top of the Milestone 2 club and section foundation:

- create discussion threads per active club book
- read thread lists from the club-book detail page
- read thread detail pages with posts
- let members create posts and edit or delete their own posts
- let club admins pin and unpin threads
- paginate thread lists and post lists with page query params

## Current Baseline
- `bookapp.threads` and `bookapp.thread_posts` already exist in [`db/schema/data.sql`](../../db/schema/data.sql).
- `threads.is_pinned`, `threads.deleted_at`, `threads.is_locked`, and `club_books.removed_at` are already present in the schema.
- Milestone 2 already provides clubs, memberships, invite flow, and admin-managed club books across the three reading sections.
- No discussion-specific repository layer, route tree, components, or tests exist yet.

## Planning Assumptions
- Milestone 3 includes thread creation, post creation, post edit/delete, admin-only pinning, and basic pagination.
- Thread edit/delete is out of scope for this milestone even though the schema can support future moderation features.
- Pinning is a club-level moderation action and is restricted to `OWNER` and `ADMIN`.
- Removed club books keep their existing threads visible, but new thread creation is blocked once `removed_at` is set.
- Use simple page-number query params for both read-heavy pages:
  - `/clubs/[clubId]/books/[clubBookId]?page=N` for threads
  - `/clubs/[clubId]/threads/[threadId]?page=N` for posts

## Delivery Order
1. [Task 01: Thread Domain and Permissions](./task-01-thread-domain-and-permissions.md)
2. [Task 02: Club Book Discussion Page](./task-02-club-book-discussion-page.md)
3. [Task 03: Thread Detail and Post Lifecycle](./task-03-thread-detail-and-post-lifecycle.md)
4. [Task 04: Thread Pinning and Pagination](./task-04-thread-pinning-and-pagination.md)
5. [Task 05: Quality Gates and Regression Coverage](./task-05-quality-gates-and-regression-coverage.md)

## Milestone Exit Criteria
- Club members can open a club-book page, see existing threads, and create a new thread for an active club book.
- Club members can open a thread detail page, add posts, and edit or delete only their own posts.
- Club admins can pin and unpin threads, and pinned threads sort ahead of non-pinned threads.
- Archived club books keep discussion history readable but reject new thread creation.
- Milestone 3 passes unit, integration, and Playwright coverage for the core discussion flows plus `pnpm lint` and `pnpm build`.

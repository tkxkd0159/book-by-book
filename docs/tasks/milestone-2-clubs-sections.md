# Milestone 2: Clubs + Sections

## Goal
Deliver the first club workflow on top of the existing auth and books foundation:

- create clubs with `PUBLIC` or `PRIVATE` visibility
- discover and join public clubs
- invite members into private clubs
- let club admins add, move, and remove books across `WANT_TO_READ`, `READING`, and `READ`

## Current Baseline
- `bookapp.clubs`, `club_members`, `club_invitations`, and `club_books` already exist in [`db/schema/data.sql`](../../db/schema/data.sql).
- Milestone 1 already provides auth, protected routes, Google Books search, import, and book detail pages.
- No club-specific repository layer, route tree, components, or tests exist yet.

## Planning Assumptions
- Treat public club join as immediate self-join. This matches the main permissions and milestone text, even though section 14.2 mentions approval-based join.
- Keep private invite delivery manual in v1: admins generate and copy an invite link instead of sending email from the app.
- Use the existing `removed_at` soft-delete model in `club_books`. Re-adding a previously removed book should reactivate the existing row instead of inserting a duplicate.
- Leave `/clubs/[clubId]/books/[clubBookId]` thread-oriented detail work to Milestone 3. Milestone 2 can link book cards back to `/books/[googleVolumeId]`.

## Delivery Order
1. [Task 01: Club Domain Foundation](./task-01-club-domain-foundation.md)
2. [Task 02: Club Discovery and Creation](./task-02-club-discovery-and-creation.md)
3. [Task 03: Membership and Invitation Flow](./task-03-membership-and-invitation-flow.md)
4. [Task 04: Club Sections and Book Management](./task-04-club-sections-and-book-management.md)
5. [Task 05: Quality Gates and Test Harness](./task-05-quality-gates-and-test-harness.md)

## Milestone Exit Criteria
- Authenticated users can create clubs and see them in `/clubs`.
- Public clubs are discoverable and joinable without admin intervention.
- Private clubs can issue invite links, and invite acceptance creates membership.
- Club home renders the three reading sections and enforces admin-only book management on the server.
- Milestone 2 passes `pnpm lint`, `pnpm build`, and Playwright coverage for the main club flows.

# Task 01: Club Domain Foundation

## Goal
Add the shared types, validation, repository helpers, and permission guards that every Milestone 2 route and action will reuse.

## Scope
- Extend [`types/db/index.ts`](../../types/db/index.ts) with club-facing records and enums:
  - `ClubRecord`
  - `ClubMemberRecord`
  - `ClubInvitationRecord`
  - `ClubBookRecord`
- Add a `lib/clubs/` module set for:
  - input validation with Zod
  - permission helpers for member/admin/owner checks
  - repository queries and mutations
  - club-specific error types or result helpers
- Centralize transaction boundaries for:
  - club creation with owner membership bootstrap
  - public join
  - invitation issue/accept/revoke
  - club book add/move/remove
- Define stable query helpers for downstream pages and actions:
  - list public clubs
  - list clubs for current user
  - fetch club detail with current-user membership
  - fetch active club books grouped by section
  - fetch pending invitations for a club

## Implementation Notes
- All mutations should scope by both `club_id` and authenticated user identity to avoid IDOR bugs.
- `club_books` already has a unique `(club_id, book_id)` constraint plus `removed_at`, so add-book logic must reactivate existing rows when appropriate.
- `sort_order` should be assigned as `max + 1` within a section during add or move operations.
- Avoid schema changes unless implementation finds a real gap. If one is required, add a new sequential SQL migration instead of editing existing migrations.

## Acceptance Criteria
- Club permissions are enforced from reusable server-side helpers instead of duplicated route logic.
- Repository functions return typed objects shaped for pages and server actions.
- Repeated membership, invite, and add-book attempts produce deterministic outcomes or validation errors.
- Club create/join/invite/book mutations can be called from App Router server actions without bespoke SQL embedded in route files.

## Expected Touchpoints
- `types/db/index.ts`
- `lib/clubs/repository.ts`
- `lib/clubs/permissions.ts`
- `lib/clubs/validation.ts`
- `lib/clubs/errors.ts` or equivalent

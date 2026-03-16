# Task 05: Quality Gates and Regression Coverage

## Goal
Add the validation and regression coverage needed to ship Milestone 3 safely.

## Scope
- Add unit coverage for:
  - thread create validation
  - post create and edit validation
  - permission helpers for member access, post authorship, and admin-only pinning
- Add integration coverage for:
  - thread creation only for active club books
  - pinned-first ordering
  - post edit and delete restricted to the author
  - pin and unpin restricted to owner or admin
  - archived club books preserving thread reads while rejecting new thread creation
  - paginated thread and post queries returning stable ordering and counts
- Add Playwright coverage for the main discussion flows:
  - member creates a thread from a club-book page
  - admin pins a thread and it moves to the top
  - member creates, edits, and deletes their own post
  - non-author cannot edit or delete another user's post
  - archived club book shows existing discussion but hides or disables create-thread UI
- Run the milestone quality gates:
  - `pnpm lint`
  - `pnpm build`
  - `pnpm test:unit`
  - `pnpm test:integration`
  - `pnpm test:e2e --project=chromium`
  - `pnpm test:e2e --project="Mobile Safari"`

## Implementation Notes
- Reuse the existing deterministic multi-user e2e auth and reset helpers introduced for Milestone 2 instead of inventing a second harness.
- Prefer integration tests for the permission matrix and pagination edge cases that would be slow or brittle in Playwright.
- If archived club-book discussion setup is cumbersome in e2e, seed the archived state through test-only helpers and keep the UI assertions focused on behavior rather than setup mechanics.

## Acceptance Criteria
- Milestone 3 ships with coverage for thread creation, post lifecycle, admin-only pinning, and archived-book read-only behavior.
- The discussion test harness can represent at least an owner/admin, a regular member, and a non-member user.
- Pagination behavior is covered at a lower level so page transitions are not validated only by manual testing.
- Lint, build, unit, integration, and required Playwright runs pass before the milestone is considered complete.

## Expected Touchpoints
- `tests/unit/threads.*.test.ts`
- `tests/integration/threads.repository.test.ts`
- `e2e/*.spec.ts`
- test-only seed or auth helpers reused from Milestone 2

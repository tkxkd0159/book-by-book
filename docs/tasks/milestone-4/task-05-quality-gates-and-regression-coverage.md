# Task 05: Quality Gates and Regression Coverage

## Goal
Add the validation and regression coverage needed to ship Milestone 4 safely.

## Scope
- Extend unit coverage for:
  - shared add-book target summarizers and selection helpers
  - shelf validation and permissions
  - review validation, permissions, and aggregate helpers
  - shared add-book logic reused by clubs and shelves
  - board-level shelf-import action helpers where behavior branches
- Extend integration coverage for:
  - shelf target queries and shelf item add/remove/note mutations
  - public shelf reads for signed-in non-owners
  - board-level shelf-import source queries and duplicate filtering
  - review upsert/delete and aggregate queries
- Extend Playwright coverage for:
  - the shared `Add Book` modal on search and detail pages, including `Clubs` and `Shelves` tabs
  - board-level `Add from shelves` club import
  - shelf item note/remove flows and public read-only shelf behavior
  - review creation, edit, and delete flows
  - reviewed profile list and book-detail aggregate rendering
- Run the Milestone 4 quality gates:
  - `pnpm lint`
  - `pnpm build`
  - `pnpm test`
  - `pnpm test:integration`
  - required Playwright runs

## Implementation Notes
- Reuse the existing deterministic e2e auth and reset helpers instead of inventing a second shelf/review harness.
- Preserve current club and thread regression coverage when modifying shared book import flows.
- Task 03 already added coverage for shelf CRUD, combined add-book flows, and board-level shelf imports. Task 05 should keep those scenarios green while adding the remaining review-focused milestone coverage and any missing final regression gaps.
- Include aggregate assertions that prove deleted reviews no longer contribute to average rating or review count.
- Keep explicit e2e assertions that public shelf routes remain read-only and that the shared `Add Book` modal still works after Task 04 changes book detail.
- Task 05 depends on Task 04 shipping the review routes and book-detail review UI first; it is the final milestone hardening pass, not a substitute for Task 04 implementation.

## Acceptance Criteria
- Milestone 4 ships with automated coverage for the shared Add Book modal, shelf item management, board-level shelf imports, public shelf reads, review lifecycle, reviewed profile entries, and book-detail aggregates.
- Changes to shared add-book logic do not regress existing club-book add flows or the new shelf-import path.
- Lint, build, unit, integration, and required Playwright runs pass before the milestone is considered complete.

## Expected Touchpoints
- `tests/unit/**/*`
- `tests/integration/**/*`
- `e2e/*.spec.ts`
- existing test helpers reused from Milestone 2 and 3

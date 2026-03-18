# Task 05: Quality Gates and Regression Coverage

## Goal
Add the validation and regression coverage needed to ship Milestone 4 safely.

## Scope
- Extend unit coverage for:
  - shelf validation and permissions
  - review validation, permissions, and aggregate helpers
  - shared add-book logic reused by shelves and clubs where behavior changes
- Extend integration coverage for:
  - shelf CRUD
  - shelf item add/remove/note mutations
  - public shelf reads for signed-in non-owners
  - review upsert/delete and aggregate queries
- Extend Playwright coverage for:
  - shelf creation and owner management
  - adding books to shelves from search and detail pages
  - public shelf reading inside auth
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
- Include aggregate assertions that prove deleted reviews no longer contribute to average rating or review count.
- If public shelf routes share UI with owner shelf routes, include e2e checks for read-only behavior on the public path.

## Acceptance Criteria
- Milestone 4 ships with automated coverage for shelf CRUD, shelf item management, public shelf reads, review lifecycle, reviewed profile entries, and book-detail aggregates.
- Changes to shared add-book logic do not regress existing club-book add flows.
- Lint, build, unit, integration, and required Playwright runs pass before the milestone is considered complete.

## Expected Touchpoints
- `tests/unit/**/*`
- `tests/integration/**/*`
- `e2e/*.spec.ts`
- existing test helpers reused from Milestone 2 and 3

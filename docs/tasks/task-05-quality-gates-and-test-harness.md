# Task 05: Quality Gates and Test Harness

## Goal
Add the validation and regression coverage needed to ship Milestone 2 safely.

## Scope
- Extend the e2e harness so protected club mutations have a deterministic signed-in user context.
- Add test data setup helpers for:
  - owner user
  - member user
  - non-member user
  - public club
  - private club
  - imported book fixture
- Add Playwright coverage for the main happy paths:
  - create a public club
  - discover and join a public club
  - create a private club and generate an invite link
  - accept an invite and gain access
  - admin add, move, and remove a book in club sections
- Add at least one permission regression test proving non-admin users cannot reach admin controls or complete admin mutations.
- Run the milestone quality gates:
  - `pnpm lint`
  - `pnpm build`
  - `pnpm test:e2e --project=chromium`
  - `pnpm test:e2e --project="Mobile Safari"` for the section layout once the mobile UI is in place

## Implementation Notes
- The current `E2E_BYPASS_AUTH=1` setup bypasses the proxy, but it does not create a real current user for server actions. Milestone 2 needs an explicit test-user strategy.
- Prefer deterministic seeding over relying on whatever happens to be in the local database.
- If multi-user invite acceptance is too heavy for a single end-to-end flow, keep one e2e happy path and cover the remaining invite state matrix in lower-level server-side tests or targeted action tests if the repo adds that harness.

## Acceptance Criteria
- Club e2e tests do not depend on manual preloaded data.
- The test harness can represent more than one authenticated user identity.
- Milestone 2 ships with coverage for creation, join, invite acceptance, and admin-only section management.
- Lint, build, and required Playwright runs pass before the milestone is considered complete.

## Expected Touchpoints
- `playwright.config.ts`
- `e2e/*.spec.ts`
- test-only auth or seed helpers introduced for Milestone 2

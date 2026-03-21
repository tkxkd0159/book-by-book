# Task 05: Quality Gates and Regression Coverage

## Goal
Add the validation and regression coverage needed to ship Milestone 5 safely.

## Scope
- Extend unit coverage for:
  - nickname validation and normalization
  - beta invitation code validation
  - signup completion guards and callback handling
  - nickname-first display helpers
  - nickname-based shelf path generation
  - invite parsing and nickname-resolution helpers
- Extend integration coverage for:
  - signup completion persistence and `signup_completed_at` updates
  - incomplete-user gating on protected reads and mutations
  - nickname-based public shelf access
  - private invite creation, deduplication, and acceptance by `invitedUserId`
- Extend Playwright coverage for:
  - sign-in to signup-completion redirect behavior
  - signup completion and callback resume
  - `/me` nickname-led profile display
  - nickname-based public shelf URLs
  - nickname-based private invite creation and acceptance
  - regression coverage for existing books, clubs, threads, shelves, and reviews flows
- Run the Milestone 5 quality gates:
  - `pnpm lint`
  - `pnpm build`
  - `pnpm test`
  - `pnpm test:integration`
  - required Playwright runs

## Implementation Notes
- Reuse the existing deterministic e2e auth and reset helpers instead of inventing a second onboarding harness.
- Seed test users with completed-signup fields by default so existing milestone flows continue to work, then add targeted incomplete-user fixtures for Milestone 5 coverage.
- Keep explicit regression assertions that existing club, thread, shelf, and review workflows stay reachable after signup gating is added.
- Playwright should prove both the onboarding detour and the post-signup callback return path.
- Task 05 depends on Tasks 01 through 04 shipping first; it is the milestone hardening pass, not a substitute for foundation or route work.

## Acceptance Criteria
- Milestone 5 ships with automated coverage for onboarding validation, auth gating, nickname routing, and nickname-based invite targeting.
- Existing milestone flows continue to pass after nickname identity replaces provider name/email in user-facing surfaces.
- Incomplete users are covered explicitly in tests rather than being treated as an untested edge case.
- Lint, build, unit, integration, and required Playwright runs pass before the milestone is considered complete.

## Expected Touchpoints
- `tests/unit/**/*`
- `tests/integration/**/*`
- `e2e/*.spec.ts`
- `lib/test/*`
- existing auth and milestone test helpers

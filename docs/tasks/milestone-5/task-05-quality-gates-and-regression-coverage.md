# Task 05: Quality Gates and Regression Coverage

## Goal
Add the validation and regression coverage needed to ship the revised Milestone 5 safely.

## Scope
- Extend unit coverage for:
  - nickname validation and normalization
  - internal email/password auth validation and password verification paths
  - route-gating helpers for incomplete public users, completed public users, and internal admins
  - invitation-code hashing, validation, and status evaluation
  - nickname-first display helpers
  - nickname-based shelf path generation
  - private-club invite parsing and nickname-resolution helpers
- Extend integration coverage for:
  - signup completion persistence and `signup_completed_at` updates
  - successful invitation-code redemption and rejection of inactive/expired/exhausted/wrong-purpose codes
  - concurrent double-submit signup completion consuming at most one redemption for the same user
  - concurrent redemption attempts against a one-use code producing exactly one success
  - successful and failed internal admin login
  - invitation-code creation, activation/deactivation, and usage accounting
  - incomplete-user gating on reader-facing reads and mutations
  - signed-in public-user rejection from admin routes
  - internal-admin redirection away from `/signup` and reader-facing routes
  - nickname-based public shelf access
  - private-club invite creation, deduplication, and acceptance by `invitedUserId`
  - repeated and concurrent invite acceptance remaining idempotent
- Extend Playwright coverage for:
  - Google sign-in to `/signup` redirect behavior
  - signup completion and callback resume with a valid code
  - invalid/expired/exhausted signup code handling
  - internal admin sign-in to invitation-code management
  - repeated failed internal admin sign-in attempts showing throttle feedback
  - public-user blocking from `/admin/*`
  - internal-admin blocking from `/signup`
  - unauthenticated redirect to `/admin/signin` for admin routes
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
- Reuse the existing deterministic e2e auth and reset helpers instead of inventing separate public and admin harnesses from scratch.
- Seed test users with completed-signup fields by default so existing milestone flows continue to work, then add targeted incomplete-public-user and internal-admin fixtures for Milestone 5 coverage.
- Seed internal-admin fixtures with a real password hash compatible with the implementation’s verification algorithm so credentials login is exercised end to end.
- Keep explicit regression assertions that existing club, thread, shelf, and review workflows stay reachable after public/admin route gating is added.
- Add explicit concurrency assertions for invitation-code redemption and invite acceptance instead of relying on non-concurrent happy-path tests.
- Playwright should prove both the onboarding detour and the admin-panel entry path.
- Task 05 depends on Tasks 01 through 04 shipping first; it is the milestone hardening pass, not a substitute for foundation or route work.

## Acceptance Criteria
- Milestone 5 ships with automated coverage for onboarding validation, public/admin auth gating, invitation-code management, invitation-code redemption, nickname routing, and nickname-based private-club invite targeting.
- Existing milestone flows continue to pass after nickname identity replaces provider name/email in reader-facing surfaces.
- Incomplete public users and internal admins are covered explicitly in tests rather than treated as untested edge cases.
- Lint, build, unit, integration, and required Playwright runs pass before the milestone is considered complete.

## Expected Touchpoints
- `tests/unit/**/*`
- `tests/integration/**/*`
- `e2e/*.spec.ts`
- `lib/test/*`
- existing auth and milestone test helpers

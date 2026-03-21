# Milestone 5: Beta Onboarding and Nickname Identity

## Goal
Deliver the closed-beta onboarding and service-native identity workflow on top of the existing auth, books, clubs, threads, shelves, and reviews foundation:

- require completed signup after OAuth before protected app access
- collect a stable nickname, gender, country, favorite genres, and beta invitation code
- use nickname as the public app identity across profile, shelves, clubs, threads, and reviews
- change public shelf sharing to nickname-based URLs
- change private-club invite targeting from email to nickname-resolved user identity

## Current Baseline
- `bookapp.users` currently stores provider metadata only and Google login immediately creates a usable app user.
- Milestones 2 through 4 already provide clubs, discussions, shelves, and reviews on top of the current auth foundation.
- Private club invites are email-targeted and invite acceptance still matches by email or user id.
- Public shelf routes are keyed by `userId`, not nickname.
- No completed-signup route, beta code gate, or nickname-first display identity exists yet.

## Planning Assumptions
- Nickname is immutable in Milestone 5 and is validated as a lowercase URL-safe handle.
- Beta access uses one shared server-side `BETA_INVITATION_CODE`; there is no admin UI or one-time code inventory in this milestone.
- Existing users without `signup_completed_at` are treated as incomplete and must finish signup before using protected routes.
- Milestone 5 does not add a public profile route or nickname change UI.
- Private club invites can only target existing signed-up users with a nickname; invite-by-email fallback stays out of scope.

## Delivery Order
1. [Task 01: User Identity and Beta Access Foundation](./task-01-user-identity-and-beta-access-foundation.md)
2. [Task 02: Signup Completion and Auth Gating](./task-02-signup-completion-and-auth-gating.md)
3. [Task 03: Nickname Profile and Public Shelf Sharing](./task-03-nickname-profile-and-public-shelf-sharing.md)
4. [Task 04: Nickname-Based Club Invitation Flow](./task-04-nickname-based-club-invitation-flow.md)
5. [Task 05: Quality Gates and Regression Coverage](./task-05-quality-gates-and-regression-coverage.md)

## Milestone Exit Criteria
- OAuth-authenticated users cannot reach the protected app until they complete Book by Book signup.
- Completed signup persists nickname, gender, country, favorite genres, and signup completion state without storing the raw beta invitation code.
- Nickname becomes the default user-facing identity across `/me`, shelves, clubs, threads, reviews, and invite pages.
- Public shelf sharing works by nickname route while preserving the existing signed-in-only public shelf access model.
- Private club invites are created by nickname and accepted only by the targeted signed-in user.
- Milestone 5 passes `pnpm lint`, `pnpm build`, `pnpm test`, `pnpm test:integration`, and required Playwright coverage for onboarding, nickname routing, and invite flows.

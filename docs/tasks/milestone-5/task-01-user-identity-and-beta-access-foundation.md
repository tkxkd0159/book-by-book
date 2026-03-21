# Task 01: User Identity and Beta Access Foundation

## Goal
Add the schema, shared validation, repository contracts, and identity helpers needed for every Milestone 5 onboarding, sharing, and invite flow.

## Scope
- Extend the app-facing database shape and domain contracts for:
  - `nickname`
  - `gender`
  - `countryCode`
  - `favoriteGenres`
  - `signupCompletedAt`
- Add the schema migration and source-of-truth schema updates needed to persist those fields on `bookapp.users`.
- Define shared onboarding validation and normalization helpers for:
  - nickname format and uniqueness
  - gender enum parsing
  - ISO country selection
  - favorite-genre allowlist validation
  - beta invitation code validation against `BETA_INVITATION_CODE`
- Update auth and user repository contracts so app identity no longer depends on provider email for normal signed-in flows.
- Add shared user display helpers that prefer nickname over provider name/email across product surfaces.

## Implementation Notes
- Keep the profile fields on `bookapp.users`; do not introduce a separate `user_profiles` table in Milestone 5.
- `signup_completed_at` is the source of truth for whether a signed-in account can use the product.
- Nickname should be stored normalized to lowercase and treated as immutable in this milestone.
- Provider `email`, `name`, and `image` remain useful provider metadata but should no longer drive app-facing identity rules.
- Beta invitation code validation must stay server-side and must never persist the raw code in the database.
- Shared favorite-genre contracts should store a flat validated list even though the UI groups Fiction and Non-Fiction separately.

## Acceptance Criteria
- The database schema and app-facing types expose all required Milestone 5 signup fields on `users`.
- Shared validation covers nickname normalization, allowed genre values, required country/gender selection, and beta code verification.
- Reusable repository helpers can determine whether a user is incomplete or fully signed up without route-local duplication.
- Shared display helpers make nickname the first-class user-facing identity.
- Normal auth/session resolution is based on the app user id and completed-signup state, not provider email fallback.

## Expected Touchpoints
- `db/schema/data.sql`
- `db/migrations/*`
- `types/db/index.ts`
- `lib/auth/*`
- `tests/unit/auth*.test.ts`
- related identity validation and presentation helpers
